module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define('Department', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'departments'
  });

  Department.associate = (models) => {
    Department.hasMany(models.User, {
      foreignKey: 'departmentId',
      as: 'users'
    });
    
    Department.belongsTo(models.User, {
      foreignKey: 'managerId',
      as: 'manager',
      constraints: false // Avoid circular dependency issues
    });
  };

  return Department;
};
