export default (sequelize, DataTypes) => {
  const ScamScan = sequelize.define(
    "ScamScan",
    {
      scan_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      input_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      prediction: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      spam_probability: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      threshold: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.3,
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
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "scam_scans",
      timestamps: false,
      underscored: true,
      indexes: [
        {
          fields: ["user_id"],
        },
        {
          fields: ["created_at"],
        },
      ],
    }
  );

  ScamScan.associate = (models) => {
    ScamScan.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
    });

    ScamScan.hasOne(models.Scam, {
      foreignKey: "source_scan_id",
      as: "scamReport",
      onDelete: "SET NULL",
    });
  };

  return ScamScan;
};
