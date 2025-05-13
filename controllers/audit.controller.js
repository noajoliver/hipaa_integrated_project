const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

// Enhanced audit logging controller with advanced filtering and reporting capabilities

// Get all audit logs with filtering
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      ipAddress,
      limit,
      offset,
      sortBy,
      sortOrder
    } = req.query;

    // Build filter conditions
    const whereConditions = {};
    
    if (userId) {
      whereConditions.userId = userId;
    }
    
    if (action) {
      whereConditions.action = action;
    }
    
    if (entityType) {
      whereConditions.entityType = entityType;
    }
    
    if (entityId) {
      whereConditions.entityId = entityId;
    }
    
    if (ipAddress) {
      whereConditions.ipAddress = ipAddress;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      whereConditions.timestamp = {};
      
      if (startDate) {
        whereConditions.timestamp[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        whereConditions.timestamp[Op.lte] = new Date(endDate);
      }
    }
    
    // Set up pagination
    const pagination = {
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0
    };
    
    // Set up sorting
    const order = [];
    if (sortBy) {
      order.push([sortBy, sortOrder === 'asc' ? 'ASC' : 'DESC']);
    } else {
      order.push(['timestamp', 'DESC']);
    }
    
    // Get audit logs with filters
    const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ],
      order,
      ...pagination
    });
    
    return res.status(200).json({
      success: true,
      count,
      data: auditLogs,
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset,
        total: count,
        pages: Math.ceil(count / pagination.limit)
      }
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: error.message
    });
  }
};

// Get audit log by ID
exports.getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const auditLog = await AuditLog.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });
    
    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    console.error('Error getting audit log:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log',
      error: error.message
    });
  }
};

// Get audit log statistics
exports.getAuditLogStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date range filter
    const whereConditions = {};
    if (startDate || endDate) {
      whereConditions.timestamp = {};
      
      if (startDate) {
        whereConditions.timestamp[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        whereConditions.timestamp[Op.lte] = new Date(endDate);
      }
    }
    
    // Total logs in period
    const totalLogs = await AuditLog.count({
      where: whereConditions
    });
    
    // Logs by action type
    const logsByAction = await AuditLog.findAll({
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereConditions,
      group: ['action'],
      order: [[sequelize.literal('count'), 'DESC']]
    });
    
    // Logs by entity type
    const logsByEntityType = await AuditLog.findAll({
      attributes: [
        'entityType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereConditions,
      group: ['entityType'],
      order: [[sequelize.literal('count'), 'DESC']]
    });
    
    // Logs by user
    const logsByUser = await AuditLog.findAll({
      attributes: [
        'userId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        ...whereConditions,
        userId: {
          [Op.ne]: null
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ],
      group: ['userId', 'user.id', 'user.firstName', 'user.lastName', 'user.username'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10
    });
    
    // Logs by IP address
    const logsByIpAddress = await AuditLog.findAll({
      attributes: [
        'ipAddress',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        ...whereConditions,
        ipAddress: {
          [Op.ne]: null
        }
      },
      group: ['ipAddress'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10
    });
    
    // Activity over time (by day)
    const activityByDay = await AuditLog.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('timestamp')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereConditions,
      group: [sequelize.fn('DATE', sequelize.col('timestamp'))],
      order: [[sequelize.fn('DATE', sequelize.col('timestamp')), 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: {
        totalLogs,
        logsByAction,
        logsByEntityType,
        logsByUser,
        logsByIpAddress,
        activityByDay
      }
    });
  } catch (error) {
    console.error('Error getting audit log statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log statistics',
      error: error.message
    });
  }
};

// Export audit logs
exports.exportAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      ipAddress,
      format
    } = req.query;

    // Build filter conditions
    const whereConditions = {};
    
    if (userId) {
      whereConditions.userId = userId;
    }
    
    if (action) {
      whereConditions.action = action;
    }
    
    if (entityType) {
      whereConditions.entityType = entityType;
    }
    
    if (entityId) {
      whereConditions.entityId = entityId;
    }
    
    if (ipAddress) {
      whereConditions.ipAddress = ipAddress;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      whereConditions.timestamp = {};
      
      if (startDate) {
        whereConditions.timestamp[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        whereConditions.timestamp[Op.lte] = new Date(endDate);
      }
    }
    
    // Get audit logs with filters
    const auditLogs = await AuditLog.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ],
      order: [['timestamp', 'DESC']]
    });
    
    // Format the data for export
    const formattedLogs = auditLogs.map(log => {
      const user = log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.username})` : 'System';
      
      return {
        id: log.id,
        timestamp: log.timestamp,
        user,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress
      };
    });
    
    // Determine export format
    if (format === 'csv') {
      // Generate CSV
      const fields = ['id', 'timestamp', 'user', 'userId', 'action', 'entityType', 'entityId', 'details', 'ipAddress'];
      const csv = json2csv({ data: formattedLogs, fields });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
      return res.status(200).send(csv);
    } else {
      // Default to JSON
      return res.status(200).json({
        success: true,
        data: formattedLogs
      });
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      error: error.message
    });
  }
};

// Get available audit log filters
exports.getAuditLogFilters = async (req, res) => {
  try {
    // Get unique actions
    const actions = await AuditLog.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('action')), 'action']],
      order: [['action', 'ASC']]
    });
    
    // Get unique entity types
    const entityTypes = await AuditLog.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('entityType')), 'entityType']],
      order: [['entityType', 'ASC']]
    });
    
    // Get users who have audit logs
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'username'],
      include: [
        {
          model: AuditLog,
          as: 'auditLogs',
          attributes: []
        }
      ],
      group: ['User.id'],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: {
        actions: actions.map(a => a.action),
        entityTypes: entityTypes.map(e => e.entityType),
        users
      }
    });
  } catch (error) {
    console.error('Error getting audit log filters:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log filters',
      error: error.message
    });
  }
};
