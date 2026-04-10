import { Thread, User } from "../config/db.js";
import { Op, fn, col } from "sequelize";

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