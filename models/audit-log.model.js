/**
 * Audit Log Model
 * 
 * @module models/audit-log
 * @description Provides tamper-evident logging for all system activities to ensure HIPAA compliance
 */

/**
 * Initialize Audit Log model
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} AuditLog model
 */
module.exports = (sequelize, DataTypes) => {
  /**
   * AuditLog model that tracks all system activities for compliance and security
   * @class AuditLog
   * @property {number} id - Unique identifier for the audit log entry
   * @property {number} userId - ID of the user who performed the action (null for system actions)
   * @property {string} action - Type of action performed (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)
   * @property {string} entityType - Type of entity affected (user, document, training, etc.)
   * @property {string} entityId - ID of the specific entity affected (if applicable)
   * @property {string} details - JSON string containing additional details about the action
   * @property {string} ipAddress - IP address from which the action was performed
   * @property {Date} timestamp - Date and time when the action occurred
   */
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who performed the action, null for system actions or unauthenticated requests'
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Action performed (CREATE, READ, UPDATE, DELETE, etc.)'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Category of the action (AUTH, DATA, ADMIN, SECURITY, etc.)'
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of entity affected (user, document, training, etc.)'
    },
    entityId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID of the entity affected, if applicable'
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string with additional details about the action'
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IP address from which the action was performed'
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'User agent (browser/client) information'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date and time when the action occurred'
    },
    hash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hash of previous log entry to ensure tamper evidence'
    }
  }, {
    timestamps: false, // Using custom timestamp field instead
    tableName: 'audit_logs',
    /**
     * Database indexes for improved query performance
     * These indexes significantly improve audit log search performance
     */
    indexes: [
      // Frequently queried fields
      { fields: ['timestamp'], name: 'idx_audit_logs_timestamp' },
      { fields: ['userId'], name: 'idx_audit_logs_user_id' },
      { fields: ['action'], name: 'idx_audit_logs_action' },
      { fields: ['category'], name: 'idx_audit_logs_category' },
      { fields: ['entityType'], name: 'idx_audit_logs_entity_type' },
      { fields: ['entityType', 'entityId'], name: 'idx_audit_logs_entity' },
      // Composite indexes for common query patterns
      { fields: ['userId', 'timestamp'], name: 'idx_audit_logs_user_time' },
      { fields: ['action', 'timestamp'], name: 'idx_audit_logs_action_time' },
      { fields: ['category', 'timestamp'], name: 'idx_audit_logs_category_time' }
    ]
  });

  /**
   * Define associations with other models
   * @param {Object} models - The models object containing all models
   */
  AuditLog.associate = (models) => {
    /**
     * AuditLog belongs to a User
     * @see models/user.model.js
     */
    AuditLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  /**
   * Creates an audit log entry with tamper-evident hash
   * @method createWithHash
   * @static
   * @async
   * @param {Object} logData - The log data to save
   * @param {number} logData.userId - User ID who performed the action
   * @param {string} logData.action - Action performed
   * @param {string} logData.entityType - Entity type affected
   * @param {string} [logData.entityId] - Entity ID affected
   * @param {Object} [logData.details] - Additional details (will be JSON stringified)
   * @param {string} [logData.ipAddress] - IP address
   * @param {string} [logData.userAgent] - User agent string
   * @returns {Promise<Object>} The created audit log entry
   */
  AuditLog.createWithHash = async function(logData) {
    const crypto = require('crypto');
    
    // Check if details is an object and stringify it
    if (logData.details && typeof logData.details === 'object') {
      logData.details = JSON.stringify(logData.details);
    }
    
    // Get the latest audit log to create hash chain
    const latestLog = await this.findOne({
      order: [['id', 'DESC']]
    });
    
    // Create hash from previous log entry + current log data
    const previousHash = latestLog ? latestLog.hash || '' : '';
    const dataToHash = `${previousHash}${logData.userId || ''}${logData.action}${logData.entityType}${logData.entityId || ''}${new Date().toISOString()}`;
    logData.hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    
    // Create the log entry with hash
    return await this.create(logData);
  };

  return AuditLog;
};