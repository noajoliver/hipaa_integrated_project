/**
 * Document model representing policy documents, procedures, forms, and other compliance materials
 * @module models/document
 */

/**
 * Document model
 * @class Document
 * @property {number} id - Unique identifier for the document
 * @property {string} title - Title of the document
 * @property {string} [description] - Detailed description of the document
 * @property {string} [filePath] - Path to the stored document file
 * @property {string} version - Document version number (default: '1.0')
 * @property {string} status - Current status of the document: 'draft', 'active', or 'archived' (default: 'active')
 * @property {Date} [reviewDate] - Date when the document needs to be reviewed
 * @property {string} documentType - Type of document: 'policy', 'procedure', 'form', 'template', 'reference', or 'other' (default: 'policy')
 * @property {string} hipaaCategory - HIPAA category: 'privacy', 'security', 'breach_notification', 'general', or 'other' (default: 'general')
 * @property {Date} createdAt - Timestamp when the document was created
 * @property {Date} updatedAt - Timestamp when the document was last updated
 * @property {Date} [deletedAt] - Soft delete timestamp
 * @property {number} [createdBy] - Foreign key reference to User who created the document
 * @property {number} [categoryId] - Foreign key reference to DocumentCategory
 */
module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
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
    filePath: {
      type: DataTypes.STRING,
      allowNull: true
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
    reviewDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    documentType: {
      type: DataTypes.ENUM('policy', 'procedure', 'form', 'template', 'reference', 'other'),
      allowNull: false,
      defaultValue: 'policy'
    },
    hipaaCategory: {
      type: DataTypes.ENUM('privacy', 'security', 'breach_notification', 'general', 'other'),
      allowNull: false,
      defaultValue: 'general'
    }
  }, {
    timestamps: true,
    paranoid: true, // Soft delete
    tableName: 'documents'
  });

  /**
   * Define associations with other models
   * @method associate
   * @static
   * @param {Object} models - The models object containing all models
   * @returns {void}
   * @memberof Document
   */
  Document.associate = (models) => {
    /**
     * Document belongs to a User (creator)
     * @memberof Document
     */
    Document.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    /**
     * Document belongs to a DocumentCategory
     * @memberof Document
     */
    Document.belongsTo(models.DocumentCategory, {
      foreignKey: 'categoryId',
      as: 'category'
    });

    /**
     * Document has many DocumentAcknowledgments
     * @memberof Document
     */
    Document.hasMany(models.DocumentAcknowledgment, {
      foreignKey: 'documentId',
      as: 'acknowledgments'
    });
  };

  return Document;
};
