module.exports = (sequelize, DataTypes) => {
  const RiskItem = sequelize.define('RiskItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    assessmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the parent risk assessment'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Category of the risk (e.g., technical, administrative, physical)'
    },
    assetName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Name of the asset or system being assessed'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Description of the risk'
    },
    threatSource: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Source of the threat'
    },
    threatAction: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Action that could exploit the vulnerability'
    },
    vulnerabilityDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of the vulnerability'
    },
    existingControls: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Controls already in place to mitigate the risk'
    },
    likelihood: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
      comment: 'Likelihood of the risk occurring'
    },
    impact: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
      comment: 'Impact if the risk occurs'
    },
    riskLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
      comment: 'Overall risk level (calculated from likelihood and impact)'
    },
    recommendedControls: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Recommended controls to mitigate the risk'
    },
    mitigationPlan: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Plan to mitigate the risk'
    },
    mitigationStatus: {
      type: DataTypes.ENUM('not_started', 'in_progress', 'completed', 'accepted'),
      allowNull: false,
      defaultValue: 'not_started',
      comment: 'Status of risk mitigation efforts'
    },
    mitigationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when mitigation was completed'
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID of the person assigned to mitigate the risk'
    },
    reviewDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when the risk should be reviewed next'
    }
  }, {
    timestamps: true,
    tableName: 'risk_items'
  });

  RiskItem.associate = (models) => {
    RiskItem.belongsTo(models.RiskAssessment, {
      foreignKey: 'assessmentId',
      as: 'assessment'
    });
    
    RiskItem.belongsTo(models.User, {
      foreignKey: 'assignedTo',
      as: 'assignee'
    });
  };

  return RiskItem;
};
