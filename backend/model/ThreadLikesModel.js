import { type } from "node:os"

export default (sequelize, DataTypes) =>{
    const ThreadLikes = sequelize.define(
    "thread_likes",
    {
        like_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        thread_id:{
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "thread",
                key: "thread_id"
            },
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "users",
                key: "user_id",
            }
        },
        like_type: {
            type: DataTypes.STRING(16),
            allowNull: false,
            validate: {
                isIn: [["like", "dislike"]],
            },
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "thread_likes",
        timestamps: false,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ["thread_id", "user_id"],
            },
            {
                fields: ["user_id"],
            },
        ],

    });

    ThreadLikes.associate = (models) => {
        ThreadLikes.belongsTo(models.Thread, {
            foreignKey: "thread_id",
            as: "thread",
            onDelete: "CASCADE",
        });

        ThreadLikes.belongsTo(models.User, {
            foreignKey: "user_id",
            as: "user",
            onDelete: "CASCADE",
        });
    }

    return ThreadLikes;
}