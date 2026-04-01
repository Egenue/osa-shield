import { Op, fn, col } from "sequelize";
import { Scam, ScamScan, ScamVote, User } from "../config/db.js";
import { analyzeMessageWithOsaModel } from "../services/osaModelService.js";
import { getSessionLocationLabel, ensureSessionLocation } from "../services/sessionLocationService.js";
import { getUserActivityHistory } from "../services/userMetricsService.js";

function parseLimit(rawLimit, fallback = 20) {
  const parsed = Number(rawLimit);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 100);
}

function normalizeReportType(inputType) {
  if (inputType === "url") {
    return "URL";
  }

  return "Message";
}

function serializeScam(report, voteCountsMap, currentVoteMap) {
  const voteCounts = voteCountsMap.get(report.scam_id) ?? {};
  const reporterName = report.is_anonymous ? "Anonymous" : report.reporter?.name ?? "Community member";

  return {
    id: report.scam_id,
    type: report.type,
    source: report.source,
    content: report.content,
    prediction: report.prediction,
    spamProbability: Number(report.spam_probability ?? 0),
    threshold: report.threshold == null ? null : Number(report.threshold),
    triggers: Array.isArray(report.triggers) ? report.triggers : [],
    explanation: report.explanation,
    location: report.location_label || "Unknown location",
    verified: Boolean(report.verified),
    anonymous: Boolean(report.is_anonymous),
    reporterName,
    timestamp: report.created_at,
    upvotes: Number(voteCounts.like ?? 0),
    downvotes: Number(voteCounts.dislike ?? 0),
    currentUserVote: currentVoteMap.get(report.scam_id) ?? null,
  };
}

async function buildVoteCountsMap(scamIds) {
  if (!scamIds.length) {
    return new Map();
  }

  const voteCounts = await ScamVote.findAll({
    attributes: [
      "scam_id",
      "vote_type",
      [fn("COUNT", col("vote_id")), "count"],
    ],
    where: {
      scam_id: {
        [Op.in]: scamIds,
      },
    },
    group: ["scam_id", "vote_type"],
    raw: true,
  });

  const voteCountsMap = new Map();

  for (const voteCount of voteCounts) {
    if (!voteCountsMap.has(voteCount.scam_id)) {
      voteCountsMap.set(voteCount.scam_id, {});
    }

    voteCountsMap.get(voteCount.scam_id)[voteCount.vote_type] = Number(voteCount.count ?? 0);
  }

  return voteCountsMap;
}

async function buildCurrentVoteMap(scamIds, userId) {
  if (!scamIds.length || !userId) {
    return new Map();
  }

  const currentVotes = await ScamVote.findAll({
    attributes: ["scam_id", "vote_type"],
    where: {
      scam_id: {
        [Op.in]: scamIds,
      },
      user_id: userId,
    },
    raw: true,
  });

  return new Map(currentVotes.map((vote) => [vote.scam_id, vote.vote_type]));
}

function handleControllerError(reply, error) {
  console.error(error);
  return reply
    .code(typeof error.statusCode === "number" ? error.statusCode : 500)
    .send({ message: error.message || "Internal server error" });
}

export const analyzeScamController = async (request, reply) => {
  try {
    const userId = request.session?.userId;
    const { inputType, content } = request.body ?? {};

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const normalizedContent = String(content ?? "").trim();
    const normalizedInputType = inputType === "url" ? "url" : "text";

    if (!normalizedContent) {
      return reply.code(400).send({ message: "Content is required" });
    }

    ensureSessionLocation(request);

    const analysis = await analyzeMessageWithOsaModel(normalizedContent);
    const scan = await ScamScan.create({
      user_id: userId,
      input_type: normalizedInputType,
      content: normalizedContent,
      prediction: analysis.prediction,
      spam_probability: analysis.spamProbability,
      threshold: analysis.threshold,
      triggers: analysis.triggers,
      explanation: analysis.explanation,
    });

    let storedScam = null;

    if (analysis.isScam) {
      storedScam = await Scam.create({
        reporter_user_id: userId,
        source_scan_id: scan.scan_id,
        type: normalizeReportType(normalizedInputType),
        source: "analysis",
        content: normalizedContent,
        prediction: analysis.prediction,
        spam_probability: analysis.spamProbability,
        threshold: analysis.threshold,
        triggers: analysis.triggers,
        explanation: analysis.explanation,
        location_label: getSessionLocationLabel(request),
      });
    }

    return reply.code(200).send({
      prediction: analysis.prediction,
      spam_probability: analysis.spamProbability,
      threshold: analysis.threshold,
      triggers: analysis.triggers,
      explanation: analysis.explanation,
      is_scam: analysis.isScam,
      scan_id: scan.scan_id,
      stored_scam_id: storedScam?.scam_id ?? null,
      stored_in_community: Boolean(storedScam),
      location: getSessionLocationLabel(request),
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const createScamReportController = async (request, reply) => {
  try {
    const userId = request.session?.userId;
    const { type, content, location, anonymous } = request.body ?? {};

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const normalizedType = String(type ?? "").trim();
    const normalizedContent = String(content ?? "").trim();

    if (!normalizedType || !normalizedContent) {
      return reply.code(400).send({ message: "Type and content are required" });
    }

    ensureSessionLocation(request);

    const scam = await Scam.create({
      reporter_user_id: userId,
      type: normalizedType,
      source: "manual",
      content: normalizedContent,
      prediction: "reported",
      explanation: "Submitted manually by a community member for review.",
      location_label: String(location ?? "").trim() || getSessionLocationLabel(request),
      is_anonymous: Boolean(anonymous),
    });

    return reply.code(201).send({
      message: "Scam report submitted successfully.",
      scam: {
        id: scam.scam_id,
        type: scam.type,
        content: scam.content,
        location: scam.location_label,
      },
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const getReportedScamsController = async (request, reply) => {
  try {
    const { type, search, limit } = request.query ?? {};
    const userId = request.session?.userId ?? null;

    const where = {};

    if (type && type !== "all") {
      where.type = String(type).trim();
    }

    const normalizedSearch = String(search ?? "").trim();
    if (normalizedSearch) {
      where.content = {
        [Op.iLike]: `%${normalizedSearch}%`,
      };
    }

    const reports = await Scam.findAll({
      where,
      include: [
        {
          model: User,
          as: "reporter",
          attributes: ["name"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseLimit(limit, 40),
    });

    const scamIds = reports.map((report) => report.scam_id);
    const [voteCountsMap, currentVoteMap] = await Promise.all([
      buildVoteCountsMap(scamIds),
      buildCurrentVoteMap(scamIds, userId),
    ]);

    return reply.code(200).send({
      reports: reports.map((report) => serializeScam(report, voteCountsMap, currentVoteMap)),
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const voteOnScamController = async (request, reply) => {
  try {
    const userId = request.session?.userId;
    const { scamId } = request.params ?? {};
    const { vote } = request.body ?? {};

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const normalizedVote = vote === "dislike" ? "dislike" : vote === "like" ? "like" : null;

    if (!scamId || !normalizedVote) {
      return reply.code(400).send({ message: "A valid vote is required" });
    }

    const scam = await Scam.findByPk(scamId);
    if (!scam) {
      return reply.code(404).send({ message: "Scam report not found" });
    }

    const existingVote = await ScamVote.findOne({
      where: {
        scam_id: scamId,
        user_id: userId,
      },
    });

    if (!existingVote) {
      await ScamVote.create({
        scam_id: scamId,
        user_id: userId,
        vote_type: normalizedVote,
      });
    } else if (existingVote.vote_type === normalizedVote) {
      await existingVote.destroy();
    } else {
      await existingVote.update({
        vote_type: normalizedVote,
        updated_at: new Date(),
      });
    }

    const voteCountsMap = await buildVoteCountsMap([scamId]);
    const currentVoteMap = await buildCurrentVoteMap([scamId], userId);

    return reply.code(200).send({
      scamId,
      upvotes: Number(voteCountsMap.get(scamId)?.like ?? 0),
      downvotes: Number(voteCountsMap.get(scamId)?.dislike ?? 0),
      currentUserVote: currentVoteMap.get(scamId) ?? null,
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};

export const getProfileActivityController = async (request, reply) => {
  try {
    const userId = request.session?.userId;

    if (!userId) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const activities = await getUserActivityHistory(userId, 15);

    return reply.code(200).send({
      activities,
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
};
