module.exports = (sequelize, DataTypes) => {
  const DocumentAcknowledgment = sequelize.define('DocumentAcknowledgment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    acknowledgmentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'document_acknowledgments',
    indexes: [
      // Foreign key indexes for performance
      { fields: ['userId'], name: 'idx_doc_ack_user_id' },
      { fields: ['documentId'], name: 'idx_doc_ack_document_id' },
      // Composite unique index to prevent duplicate acknowledgments
      { fields: ['userId', 'documentId'], unique: true, name: 'idx_doc_ack_user_document' },
      // Date index for reporting
      { fields: ['acknowledgmentDate'], name: 'idx_doc_ack_date' }
    ]
  });

  DocumentAcknowledgment.associate = (models) => {
    DocumentAcknowledgment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    DocumentAcknowledgment.belongsTo(models.Document, {
      foreignKey: 'documentId',
      as: 'document'
    });
  };

  return DocumentAcknowledgment;
};
