module.exports = (sequelize, DataTypes) => {
  const TrainingAssignment = sequelize.define('TrainingAssignment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    assignedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completionDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('assigned', 'in_progress', 'completed', 'expired', 'failed'),
      allowNull: false,
      defaultValue: 'assigned'
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Score as percentage (0-100)'
    },
    certificatePath: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to certificate file'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'training_assignments'
  });

  TrainingAssignment.associate = (models) => {
    TrainingAssignment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    TrainingAssignment.belongsTo(models.TrainingCourse, {
      foreignKey: 'courseId',
      as: 'course'
    });
    
    TrainingAssignment.belongsTo(models.User, {
      foreignKey: 'assignedBy',
      as: 'assigner'
    });
  };

  return TrainingAssignment;
};
