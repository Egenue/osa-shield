export default (sequelize, DataTypes) => {
  const Scam = sequelize.define(
    "Scam",
    {
      scam_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      reporter_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      source_scan_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      source: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "manual",
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      prediction: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "spam",
      },
      spam_probability: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      threshold: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      triggers: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      explanation: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      location_label: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_anonymous: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      verified: {
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
      tableName: "scams",
      timestamps: false,
      underscored: true,
      indexes: [
        {
          fields: ["reporter_user_id"],
        },
        {
          fields: ["type"],
        },
        {
          fields: ["created_at"],
        },
      ],
    }
  );

  Scam.associate = (models) => {
    Scam.belongsTo(models.User, {
      foreignKey: "reporter_user_id",
      as: "reporter",
      onDelete: "CASCADE",
    });

    Scam.belongsTo(models.ScamScan, {
      foreignKey: "source_scan_id",
      as: "sourceScan",
      onDelete: "SET NULL",
    });

    Scam.hasMany(models.ScamVote, {
      foreignKey: "scam_id",
      as: "votes",
      onDelete: "CASCADE",
    });
  };

  return Scam;
};
