export default (sequelize, DataTypes) => {
  const ScamVote = sequelize.define(
    "ScamVote",
    {
      vote_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      scam_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      vote_type: {
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
      tableName: "scam_votes",
      timestamps: false,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["scam_id", "user_id"],
        },
        {
          fields: ["user_id"],
        },
      ],
    }
  );

  ScamVote.associate = (models) => {
    ScamVote.belongsTo(models.Scam, {
      foreignKey: "scam_id",
      as: "scam",
      onDelete: "CASCADE",
    });

    ScamVote.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
    });
  };

  return ScamVote;
};
