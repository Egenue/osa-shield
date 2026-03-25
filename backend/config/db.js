import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import dns from "dns";


dotenv.config();

const database_url = process.env.DATABASE_URL;
const db_user =process.env.DB_USER;
const db_password = process.env.DB_PASSWORD;
const db_host = process.env.DB_HOST;
const db_name = process.env.DB_NAME;

const {address} = await dns.promises.lookup(db_host, {family: 4});


const sequelize = new Sequelize(db_name, db_user, db_password, {
    dialect: "postgres",
    host: address,
   
    logging: false,
    dialectOptions: {
        ssl: {
            rejectUnauthorized: false,
            servername: db_host,
        },
        keepAliver: true,
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 60000,
        idle: 10000,
    },
});

export default sequelize;
