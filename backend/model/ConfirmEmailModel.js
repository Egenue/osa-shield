

export default (sequelize, DataTypes) => {
  const ConfirmEmail = sequelize.define(
    "ConfirmEmail",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },

      used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "email_verifications",
      timestamps: false,
      underscored: true,
    }
  );

 
  ConfirmEmail.associate = (models) => {
    ConfirmEmail.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
    });
  };

  return ConfirmEmail;
};