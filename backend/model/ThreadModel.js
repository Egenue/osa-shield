
export default (sequelize, DataTypes) => {
    const Thread = sequelize.define(
        "thread",
        {
            thread_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            thread_user_id: {
                type: DataTypes.UUID,
                allowNull: false,

                references: {
                    model: "users",
                    key: "user_id",
                }
            },
            title: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            detailed_intelligence: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            comments_disabled: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "thread",
            timestamps: false,
            underscored: true,
            indexes: [
                {
                    fields: ["thread_user_id"],
                },
                {
                    fields: ["created_at"],
                }
            ],
        }
        
    );

    Thread.associate = (models) => {
        Thread.belongsTo(models.User, {
            foreignKey: "thread_user_id",
            as: "author",
        });
    };

    return Thread;

};
