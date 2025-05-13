module.exports = (sequelize, DataTypes) => {
  const Incident = sequelize.define('Incident', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    incidentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    reportedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User ID of the person who reported the incident'
    },
    reportedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('reported', 'under_investigation', 'remediated', 'closed', 'archived'),
      allowNull: false,
      defaultValue: 'reported'
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium'
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Category of the incident (e.g., security, privacy, technical)'
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Physical or logical location where the incident occurred'
    },
    affectedSystems: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Systems affected by the incident'
    },
    affectedData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Types of data affected by the incident'
    },
    containmentActions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Actions taken to contain the incident'
    },
    remediationPlan: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Plan to remediate the incident'
    },
    remediationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when remediation was completed'
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID of the person assigned to handle the incident'
    },
    rootCause: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Root cause analysis of the incident'
    },
    preventiveMeasures: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Measures to prevent similar incidents in the future'
    },
    isBreachable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the incident is potentially a reportable breach'
    },
    breachDeterminationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when breach determination was made'
    },
    breachDeterminationBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID of the person who made the breach determination'
    },
    breachNotificationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when breach notification was sent'
    },
    closedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when the incident was closed'
    },
    closedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID of the person who closed the incident'
    },
    documentPath: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Path to the incident documentation file if stored as a file'
    }
  }, {
    timestamps: true,
    tableName: 'incidents',
    indexes: [
      // Status is frequently queried
      { fields: ['status'], name: 'idx_incidents_status' },
      // Commonly used in filters and searches
      { fields: ['reportedBy'], name: 'idx_incidents_reported_by' },
      { fields: ['assignedTo'], name: 'idx_incidents_assigned_to' },
      { fields: ['severity'], name: 'idx_incidents_severity' },
      { fields: ['category'], name: 'idx_incidents_category' },
      { fields: ['isBreachable'], name: 'idx_incidents_breachable' },
      // Date fields for reporting and filtering
      { fields: ['incidentDate'], name: 'idx_incidents_date' },
      { fields: ['closedDate'], name: 'idx_incidents_closed_date' },
      { fields: ['remediationDate'], name: 'idx_incidents_remediation_date' },
      // Composite indexes for reports
      { fields: ['status', 'severity'], name: 'idx_incidents_status_severity' },
      { fields: ['assignedTo', 'status'], name: 'idx_incidents_assigned_status' }
    ]
  });

  Incident.associate = (models) => {
    Incident.belongsTo(models.User, {
      foreignKey: 'reportedBy',
      as: 'reporter'
    });
    
    Incident.belongsTo(models.User, {
      foreignKey: 'assignedTo',
      as: 'assignee'
    });
    
    Incident.belongsTo(models.User, {
      foreignKey: 'breachDeterminationBy',
      as: 'breachDeterminer'
    });
    
    Incident.belongsTo(models.User, {
      foreignKey: 'closedBy',
      as: 'closer'
    });
    
    Incident.hasMany(models.IncidentUpdate, {
      foreignKey: 'incidentId',
      as: 'updates'
    });
  };

  return Incident;
};
