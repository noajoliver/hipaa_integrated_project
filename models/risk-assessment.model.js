module.exports = (sequelize, DataTypes) => {
  const RiskAssessment = sequelize.define('RiskAssessment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assessmentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    conductedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User ID of the person who conducted the assessment'
    },
    status: {
      type: DataTypes.ENUM('draft', 'in_progress', 'completed', 'archived'),
      allowNull: false,
      defaultValue: 'draft'
    },
    nextAssessmentDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    methodology: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Methodology used for the risk assessment'
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Scope of the risk assessment'
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Executive summary of findings'
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID of the person who approved the assessment'
    },
    approvalDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    documentPath: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to the full risk assessment document if stored as a file'
    }
  }, {
    timestamps: true,
    tableName: 'risk_assessments'
  });

  RiskAssessment.associate = (models) => {
    RiskAssessment.belongsTo(models.User, {
      foreignKey: 'conductedBy',
      as: 'conductor'
    });
    
    RiskAssessment.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
    
    RiskAssessment.hasMany(models.RiskItem, {
      foreignKey: 'assessmentId',
      as: 'riskItems'
    });
  };

  return RiskAssessment;
};
