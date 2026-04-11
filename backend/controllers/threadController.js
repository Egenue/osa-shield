import { ok } from "node:assert";
import { Thread, ThreadComments, ThreadLikes, User } from "../config/db.js";
import { Op, fn, col, where } from "sequelize";

export const createThreadController = async(request, reply) => {
    try {
        const userId = request.session?.userId;
        const{title, detailedIntelligence} = request.body ?? {};

        if(!userId){
            return reply.code(401).send({message: "Unauthorized"});
        }

        if(!title || !detailedIntelligence){
            return reply.code(400).send({message: "All fields are required"});
        }

        const thread = await Thread.create({
            thread_user_id: userId,
            title: title,
            detailed_intelligence: detailedIntelligence,

        });

        return reply.code(201).send({
            message: "Zone thread created",
            thread: thread
        });

    } catch (error) {
        return reply.code(500).send({message: "Internal server error"});
    }
}

export const getCreatedThreadsController = async(request, reply) =>{
    try {

        const userId = request.session?.userId ?? null;

        const where = {};

        const threads = await Thread.findAll({
            where,
            include: [
                {
                    model: User,
                    as: "author",
                    attributes: ["name"],
                },
            ],
            order: [["created_at", "DESC"]],
        });

        return reply.code(200).send({
            threads: threads,
        });

    } catch (error) {
        return reply.code(500).send({message: "Internal server error"});
        console.log(error);
    }
}

export const createThreadCommentController = async(request, reply) => {
    try {
        const userId = request.session?.userId;
        const { threadId } = request.params;
        const {comment} = request.body ?? {};

        if(!userId){
            return reply.code(401).send({message: "Unauthorized"});
        }

        if(!comment){
            return reply.code(400).send({message: "Please fill comment"});
        }
        
        const newComment = await ThreadComments.create({
            user_id: userId,
            thread_id: threadId,
            comment: comment
        });

        return reply.code(201).send({
            message: "Contributed to osa zone comments hurray!",
            comment: newComment
        });
        
    } catch (error) {
        return reply.code(500).send({message: "Internal server error"});
        console.log(error);
    }
}

export const getThreadCommentController = async(request, reply) =>{
    try {
        const {threadId} = request.params;
        
        const comments = await ThreadComments.findAll({
            where: {thread_id: threadId},
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["name"]
                }
            ],
            order: [["created_at", "ASC"]]
        
        });

        return reply.code(200).send({
            ok: true,
            comments: comments
        });
        
    } catch (error) {
        return reply.code(500).send({message: "Internal server error"});
    }

}

export const threadLikesController = async(request, reply) => {
    try {
        const { threadId } = request.params;
        const { likeType} = request.body;
        const userId = request.session?.userId;

        if(!userId){
            return reply.code(401).send({message: "Unauthorized"});
        }

        if(!['like', 'dislike'].includes(likeType)){
            return reply.code(400).send({message: "Invalid vote type"});
        }

        const existingVote = await ThreadLikes.findOne({
            where: {
                thread_id: threadId,
                user_id: userId
            }
        });

        if(existingVote){
            if(existingVote.like_type === likeType){
                await existingVote.destroy();
                return reply.code(200).send({
                    message: "Removed",
                    action: "removed"
                });
            }else{
                existingVote.like_type = likeType;
                await existingVote.save();
                return reply.code(200).send({
                    message: "added",
                    action: "updated"
                });
            }
        }

        const newVote = await ThreadLikes.create({
            thread_id: threadId,
            user_id: userId,
            like_type: likeType
        });

        return reply.code(201).send({
            message: "success",
            action: "created",
            vote: newVote
        });
    } catch (error) {
        return reply.code(500).send({message: "Internal server error"});
        console.error(error);
    }
}

export const threadLikeAndDislikesCountsController = async(request, reply) => {
    try {
        const {threadId} = request.params;

        const likes = await ThreadLikes.count({
            where: {
                thread_id: threadId,
                like_type: 'like'
            }
        });
        
        const dislikes = await ThreadLikes.count({
            where: {
                thread_id: threadId,
                like_type: 'dislike'
            }
        });

        return reply.code(200).send({
            ok: true,
            threadId,
            likes,
            dislikes,
            totalScore: likes - dislikes
        });

    } catch (error) {
        return reply.code(500).send({message: "Internal server error"});
        console.log(error);
    }
}

export const getThreadCommentsCountController = async(request, reply) => {
    try {
        const {threadId} = request.params;
        const count = await ThreadComments.count({
            where: {thread_id: threadId}
        });

        return reply.code(200).send({count});
    } catch (error) {
        return reply.code(500).send({message: "Internal server error"});
        console.log(error);
    }
}