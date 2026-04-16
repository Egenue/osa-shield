import { Thread, ThreadComments, ThreadLikes, User } from "../config/db.js";

function handleControllerError(reply, error) {
  console.error(error);
  return reply
    .code(typeof error.statusCode === "number" ? error.statusCode : 500)
    .send({ message: error.message || "Internal server error" });
}

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serializeThread(thread) {
  return {
    id: thread.thread_id,
    thread_id: thread.thread_id,
    thread_user_id: thread.thread_user_id,
    title: thread.title,
    detailed_intelligence: thread.detailed_intelligence,
    comments_disabled: Boolean(thread.comments_disabled),
    created_at: thread.created_at,
    author: thread.author
      ? {
          id: thread.author.user_id,
          name: thread.author.name,
        }
      : null,
  };
}

function serializeComment(comment) {
  return {
    id: comment.comment_id,
    comment_id: comment.comment_id,
    thread_id: comment.thread_id,
    user_id: comment.user_id,
    parent_comment_id: comment.parent_comment_id ?? null,
    comment: comment.is_deleted ? "" : comment.comment,
    is_deleted: Boolean(comment.is_deleted),
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    user: comment.user
      ? {
          id: comment.user.user_id,
          name: comment.user.name,
        }
      : null,
  };
}

async function findThreadOrThrow(threadId) {
  const thread = await Thread.findByPk(threadId, {
    include: [
      {
        model: User,
        as: "author",
        attributes: ["user_id", "name"],
      },
    ],
  });

  if (!thread) {
    throw createError("Thread not found", 404);
  }

  return thread;
}

async function getThreadVoteCounts(threadId, userId = null) {
  const [likes, dislikes, currentVote] = await Promise.all([
    ThreadLikes.count({
      where: {
        thread_id: threadId,
        like_type: "like",
      },
    }),
    ThreadLikes.count({
      where: {
        thread_id: threadId,
        like_type: "dislike",
      },
    }),
    userId
      ? ThreadLikes.findOne({
          where: {
            thread_id: threadId,
            user_id: userId,
          },
          raw: true,
        })
      : null,
  ]);

  return {
    likes,
    dislikes,
    totalScore: likes - dislikes,
    currentUserVote: currentVote?.like_type ?? null,
  };
}

export const createThreadController = async (request, reply) => {
  try {
    const userId = request.session?.userId;
    const { title, detailedIntelligence } = request.body ?? {};

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const normalizedTitle = String(title ?? "").trim();
    const normalizedDetails = String(detailedIntelligence ?? "").trim();

    if (!normalizedTitle || !normalizedDetails) {
      return reply.code(400).send({ message: "All fields are required" });
    }

    const thread = await Thread.create({
      thread_user_id: userId,
      title: normalizedTitle,
      detailed_intelligence: normalizedDetails,
      comments_disabled: false,
    });

    const createdThread = await findThreadOrThrow(thread.thread_id);

    return reply.code(201).send({
      message: "Zone thread created",
      thread: serializeThread(createdThread),
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const updateThreadController = async (request, reply) => {
  try {
    const userId = request.session?.userId;
    const { threadId } = request.params ?? {};
    const { title, detailedIntelligence, commentsDisabled } = request.body ?? {};

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const thread = await findThreadOrThrow(threadId);

    if (thread.thread_user_id !== userId) {
      return reply.code(403).send({ message: "Only the thread author can update this thread." });
    }

    const updates = {};

    if (title !== undefined) {
      const normalizedTitle = String(title).trim();
      if (!normalizedTitle) {
        return reply.code(400).send({ message: "Thread title cannot be empty." });
      }
      updates.title = normalizedTitle;
    }

    if (detailedIntelligence !== undefined) {
      const normalizedDetails = String(detailedIntelligence).trim();
      if (!normalizedDetails) {
        return reply.code(400).send({ message: "Thread details cannot be empty." });
      }
      updates.detailed_intelligence = normalizedDetails;
    }

    if (commentsDisabled !== undefined) {
      updates.comments_disabled = Boolean(commentsDisabled);
    }

    if (!Object.keys(updates).length) {
      return reply.code(400).send({ message: "No updates were provided." });
    }

    await thread.update(updates);

    return reply.code(200).send({
      message: "Thread updated.",
      thread: serializeThread(thread),
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const deleteThreadController = async (request, reply) => {
  try {
    const userId = request.session?.userId;
    const { threadId } = request.params ?? {};

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const thread = await findThreadOrThrow(threadId);

    if (thread.thread_user_id !== userId) {
      return reply.code(403).send({ message: "Only the thread author can delete this thread." });
    }

    await Promise.all([
      ThreadLikes.destroy({ where: { thread_id: threadId } }),
      ThreadComments.destroy({ where: { thread_id: threadId } }),
    ]);
    await thread.destroy();

    return reply.code(200).send({ message: "Thread deleted." });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const getCreatedThreadsController = async (_request, reply) => {
  try {
    const threads = await Thread.findAll({
      include: [
        {
          model: User,
          as: "author",
          attributes: ["user_id", "name"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return reply.code(200).send({
      threads: threads.map(serializeThread),
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const createThreadCommentController = async (request, reply) => {
  try {
    const userId = request.session?.userId;
    const { threadId } = request.params ?? {};
    const { comment, parentCommentId } = request.body ?? {};

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const normalizedComment = String(comment ?? "").trim();
    if (!normalizedComment) {
      return reply.code(400).send({ message: "Please fill comment" });
    }

    const thread = await findThreadOrThrow(threadId);
    if (thread.comments_disabled) {
      return reply.code(403).send({ message: "Comments are disabled for this thread." });
    }

    if (parentCommentId) {
      const parentComment = await ThreadComments.findOne({
        where: {
          comment_id: parentCommentId,
          thread_id: threadId,
        },
      });

      if (!parentComment) {
        return reply.code(404).send({ message: "Parent comment not found." });
      }
    }

    const newComment = await ThreadComments.create({
      user_id: userId,
      thread_id: threadId,
      parent_comment_id: parentCommentId || null,
      comment: normalizedComment,
      is_deleted: false,
      updated_at: new Date(),
    });

    const savedComment = await ThreadComments.findByPk(newComment.comment_id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "name"],
        },
      ],
    });

    return reply.code(201).send({
      message: "Comment added.",
      comment: serializeComment(savedComment),
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const getThreadCommentController = async (request, reply) => {
  try {
    const { threadId } = request.params ?? {};

    const comments = await ThreadComments.findAll({
      where: { thread_id: threadId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "name"],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    return reply.code(200).send({
      ok: true,
      comments: comments.map(serializeComment),
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const updateThreadCommentController = async (request, reply) => {
  try {
    const userId = request.session?.userId;
    const { threadId, commentId } = request.params ?? {};
    const { comment } = request.body ?? {};

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const normalizedComment = String(comment ?? "").trim();
    if (!normalizedComment) {
      return reply.code(400).send({ message: "Comment cannot be empty." });
    }

    const existingComment = await ThreadComments.findOne({
      where: {
        comment_id: commentId,
        thread_id: threadId,
      },
    });

    if (!existingComment) {
      return reply.code(404).send({ message: "Comment not found." });
    }

    if (existingComment.user_id !== userId) {
      return reply.code(403).send({ message: "Only the comment author can edit this comment." });
    }

    if (existingComment.is_deleted) {
      return reply.code(400).send({ message: "Deleted comments cannot be edited." });
    }

    await existingComment.update({
      comment: normalizedComment,
      updated_at: new Date(),
    });

    const updatedComment = await ThreadComments.findByPk(existingComment.comment_id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "name"],
        },
      ],
    });

    return reply.code(200).send({
      message: "Comment updated.",
      comment: serializeComment(updatedComment),
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const deleteThreadCommentController = async (request, reply) => {
  try {
    const userId = request.session?.userId;
    const { threadId, commentId } = request.params ?? {};

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const existingComment = await ThreadComments.findOne({
      where: {
        comment_id: commentId,
        thread_id: threadId,
      },
    });

    if (!existingComment) {
      return reply.code(404).send({ message: "Comment not found." });
    }

    if (existingComment.user_id !== userId) {
      return reply.code(403).send({ message: "You cannot delete this comment." });
    }

    await existingComment.update({
      comment: "",
      is_deleted: true,
      updated_at: new Date(),
    });

    const deletedComment = await ThreadComments.findByPk(existingComment.comment_id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "name"],
        },
      ],
    });

    return reply.code(200).send({
      message: "Comment deleted.",
      comment: serializeComment(deletedComment),
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const threadLikesController = async (request, reply) => {
  try {
    const { threadId } = request.params ?? {};
    const { likeType } = request.body ?? {};
    const userId = request.session?.userId;

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    if (!["like", "dislike"].includes(likeType)) {
      return reply.code(400).send({ message: "Invalid vote type" });
    }

    await findThreadOrThrow(threadId);

    const existingVote = await ThreadLikes.findOne({
      where: {
        thread_id: threadId,
        user_id: userId,
      },
    });

    let action = "created";

    if (existingVote) {
      if (existingVote.like_type === likeType) {
        await existingVote.destroy();
        action = "removed";
      } else {
        await existingVote.update({
          like_type: likeType,
          updated_at: new Date(),
        });
        action = "updated";
      }
    } else {
      await ThreadLikes.create({
        thread_id: threadId,
        user_id: userId,
        like_type: likeType,
      });
    }

    const counts = await getThreadVoteCounts(threadId, userId);

    return reply.code(200).send({
      message: "Vote updated.",
      action,
      threadId,
      ...counts,
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const threadLikeAndDislikesCountsController = async (request, reply) => {
  try {
    const { threadId } = request.params ?? {};
    const userId = request.session?.userId ?? null;
    const counts = await getThreadVoteCounts(threadId, userId);

    return reply.code(200).send({
      ok: true,
      threadId,
      ...counts,
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const getThreadCommentsCountController = async (request, reply) => {
  try {
    const { threadId } = request.params ?? {};
    const count = await ThreadComments.count({
      where: {
        thread_id: threadId,
        is_deleted: false,
      },
    });

    return reply.code(200).send({ count });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};
