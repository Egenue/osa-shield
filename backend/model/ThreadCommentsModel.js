
export default (sequelize, DataTypes)=>{
    const ThreadComments = sequelize.define(
        "thread_comments",
        {
            comment_id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4,
            },
            thread_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "thread",
                    key: "thread_id",
                },
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "users",
                    key: "user_id",
                },
            },
            parent_comment_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            comment: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            is_deleted: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "thread_comment",
            timestamps: false,
            underscored: true,
            indexes: [

            ],
        }
    );

    ThreadComments.associate = (models) => {
        ThreadComments.belongsTo(models.Thread, {
            foreignKey: "thread_id",
            as: "thread",
            onDelete: "CASCADE",
        });

            ThreadComments.belongsTo(models.User, {
            foreignKey: "user_id",
            as: "user",
            onDelete: "CASCADE",
        });

        ThreadComments.belongsTo(models.ThreadComments, {
            foreignKey: "parent_comment_id",
            as: "parent",
        });

        ThreadComments.hasMany(models.ThreadComments, {
            foreignKey: "parent_comment_id",
            as: "replies",
        });
    };

    return ThreadComments;

}
