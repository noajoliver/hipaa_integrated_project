module.exports = (sequelize, DataTypes) => {
  const DocumentCategory = sequelize.define('DocumentCategory', {
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
    tableName: 'document_categories'
  });

  DocumentCategory.associate = (models) => {
    DocumentCategory.hasMany(models.Document, {
      foreignKey: 'categoryId',
      as: 'documents'
    });
    
    DocumentCategory.belongsTo(models.DocumentCategory, {
      foreignKey: 'parentId',
      as: 'parent',
      constraints: false // Avoid circular dependency issues
    });
    
    DocumentCategory.hasMany(models.DocumentCategory, {
      foreignKey: 'parentId',
      as: 'children',
      constraints: false // Avoid circular dependency issues
    });
  };

  return DocumentCategory;
};
