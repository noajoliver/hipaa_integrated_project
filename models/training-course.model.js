module.exports = (sequelize, DataTypes) => {
  const TrainingCourse = sequelize.define('TrainingCourse', {
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
    contentType: {
      type: DataTypes.ENUM('video', 'document', 'quiz', 'interactive', 'webinar', 'classroom'),
      allowNull: false,
      defaultValue: 'document'
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    frequencyDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'How often training should be repeated in days (e.g., 365 for annual)'
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '1.0'
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'archived'),
      allowNull: false,
      defaultValue: 'active'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Content or URL to content'
    },
    passingScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Minimum score required to pass (percentage)'
    }
  }, {
    timestamps: true,
    paranoid: true, // Soft delete
    tableName: 'training_courses'
  });

  TrainingCourse.associate = (models) => {
    TrainingCourse.hasMany(models.TrainingAssignment, {
      foreignKey: 'courseId',
      as: 'assignments'
    });
  };

  return TrainingCourse;
};
