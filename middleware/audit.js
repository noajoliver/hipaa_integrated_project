const { Op } = require('sequelize');
const { logger } = require('../utils/logger');

// Middleware to create audit logs
const createAuditLog = async (req, res, next) => {
  try {
    // Skip audit logging for certain routes
    const skipPaths = [
      '/api/auth/login', 
      '/api/auth/logout', 
      '/',
      '/favicon.ico',
      '/api/health'
    ];
    
    // Check if the path starts with any of the skip paths
    if (skipPaths.some(path => req.path === path || req.path.startsWith(path + '/'))) {
      return next();
    }
    
    // Get user from request (set by authJwt middleware)
    const userId = req.user ? req.user.id : null;
    
    // Determine action based on HTTP method
    let action;
    switch (req.method) {
      case 'GET':
        action = 'READ';
        break;
      case 'POST':
        action = 'CREATE';
        break;
      case 'PUT':
      case 'PATCH':
        action = 'UPDATE';
        break;
      case 'DELETE':
        action = 'DELETE';
        break;
      default:
        action = 'OTHER';
    }
    
    // Determine entity type from path
    const pathParts = req.path.split('/').filter(part => part);
    const entityType = pathParts.length > 0 ? pathParts[0] : 'unknown';
    
    // Determine entity ID if available
    const entityId = pathParts.length > 1 ? pathParts[1] : null;
    
    // Create audit log entry
    const { AuditLog } = require('../models');
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      details: JSON.stringify({
        method: req.method,
        path: req.path,
        query: req.query,
        // Don't log sensitive data
        body: req.method !== 'GET' && !req.path.includes('/auth') ? req.body : undefined
      }),
      ipAddress: req.ip,
      timestamp: new Date()
    });
    
    next();
  } catch (error) {
    logger.warn(`Audit logging failed: ${req.method} ${req.path} - ${error.message}`);
    // Continue processing even if audit logging fails
    next();
  }
};

module.exports = createAuditLog;
