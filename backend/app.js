import Fastify from "fastify";
import dotenv from "dotenv";
import routes from "./routes/routes.js";
import sequelize from "./config/db.js";

dotenv.config()

const port = process.env.PORT

const fastify = Fastify({
    logger: true
});

fastify.register(routes, {prefix: "/"});

const start = async () =>{
    try {

        await sequelize.authenticate();
        console.log(`Database connected successfully`);

       await fastify.listen(
            {
                port: port,
                host: '0.0.0.0'
            }
        );
    } catch (error) {
        fastify.log.error(error);
        process.exit(1)
    }
}

start()