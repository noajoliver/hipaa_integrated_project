module.exports = (sequelize, DataTypes) => {
  const IncidentUpdate = sequelize.define('IncidentUpdate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    incidentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the parent incident'
    },
    updateDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User ID of the person who made the update'
    },
    updateType: {
      type: DataTypes.ENUM('status_change', 'assignment', 'investigation', 'remediation', 'breach_determination', 'closure', 'comment'),
      allowNull: false,
      defaultValue: 'comment'
    },
    previousStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Previous status of the incident (for status changes)'
    },
    newStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'New status of the incident (for status changes)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Description of the update'
    },
    attachmentPath: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to any attachment related to this update'
    }
  }, {
    timestamps: true,
    tableName: 'incident_updates'
  });

  IncidentUpdate.associate = (models) => {
    IncidentUpdate.belongsTo(models.Incident, {
      foreignKey: 'incidentId',
      as: 'incident'
    });
    
    IncidentUpdate.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  };

  return IncidentUpdate;
};
