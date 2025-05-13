/**
 * JWT Authentication Middleware
 * @module middleware/auth.jwt
 */
const { User, Department } = require('../models');
const { verifyToken: tokenVerify } = require('../utils/token-manager');
const { AppError, asyncHandler } = require('../utils/error-handler');
const { updateSessionActivity } = require('../utils/session-manager');
const securityService = require('../services/security.service');

/**
 * Verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyToken = asyncHandler(async (req, res, next) => {
  // Get token from cookie or authorization header
  let token = req.cookies.token || req.headers['x-access-token'] || req.headers['authorization'];

  if (!token) {
    throw new AppError('No authentication token provided', 401, 'AUTH_MISSING_TOKEN');
  }

  // Remove Bearer prefix if present
  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  }

  try {
    // Verify token and check blacklist
    const decoded = await tokenVerify(token);

    // Find user by ID
    const user = await User.findByPk(decoded.id, {
      include: ['role']
    });

    if (!user) {
      throw new AppError('User associated with token no longer exists', 404, 'AUTH_USER_NOT_FOUND');
    }

    // Check if user is active
    if (user.accountStatus !== 'active') {
      let message = 'Account is not active';
      let errorCode = 'AUTH_ACCOUNT_INACTIVE';

      if (user.accountStatus === 'locked') {
        message = 'Account is locked. Please contact an administrator.';
        errorCode = 'AUTH_ACCOUNT_LOCKED';
      } else if (user.accountStatus === 'inactive') {
        message = 'Account has been deactivated. Please contact an administrator.';
        errorCode = 'AUTH_ACCOUNT_DEACTIVATED';
      } else if (user.accountStatus === 'pending') {
        message = 'Account is pending approval. Please wait for activation.';
        errorCode = 'AUTH_ACCOUNT_PENDING';
      }

      throw new AppError(message, 403, errorCode);
    }

    // Check if account is temporarily locked
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.lockUntil) - new Date()) / 60000);
      throw new AppError(
        `Account is temporarily locked. Try again in ${remainingTime} minutes.`,
        403,
        'AUTH_ACCOUNT_TEMPORARILY_LOCKED'
      );
    }
    
    // Check for IP restrictions if enabled
    if (user.allowedIPs && user.allowedIPs.length > 0) {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const isAllowedIP = await securityService.checkAllowedIP(user, ipAddress);
      
      if (!isAllowedIP) {
        // Log security event
        await securityService.logSecurityEvent(user.id, 'ACCESS_DENIED_IP', {
          ipAddress,
          userAgent: req.headers['user-agent'] || 'unknown'
        });
        
        throw new AppError(
          'Access denied from this IP address',
          403,
          'AUTH_IP_RESTRICTED'
        );
      }
    }

    // Add user and decoded token data to request object
    req.user = user;
    req.tokenData = decoded;
    
    // Add session info to request
    if (decoded.sessionId) {
      req.sessionId = decoded.sessionId;
      
      // Update session activity timestamp
      await updateSessionActivity(decoded.sessionId);
    }

    // Check if password change is required or password has expired
    const passwordExpired = await securityService.isPasswordExpired(user);
    if (user.requirePasswordChange || passwordExpired) {
      // Allow access only to the password change endpoint and logout
      if (req.path !== '/api/auth/change-password' && 
          req.path !== '/api/auth/logout' && 
          req.path !== '/api/auth/sessions') {
        return res.status(403).json({
          success: false,
          message: 'Password change required',
          errorCode: 'AUTH_PASSWORD_CHANGE_REQUIRED',
          requirePasswordChange: true
        });
      }
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    // Handle JWT-specific errors
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid authentication token', 401, 'AUTH_INVALID_TOKEN');
    }

    if (error.name === 'TokenExpiredError') {
      throw new AppError('Authentication token has expired', 401, 'AUTH_EXPIRED_TOKEN');
    }

    throw new AppError('Failed to authenticate token', 500, 'AUTH_ERROR');
  }
});

/**
 * Check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAdmin = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (!user.role) {
    throw new AppError('No role assigned to user', 403, 'ROLE_NOT_ASSIGNED');
  }

  // Check if role has admin permissions
  const permissions = user.role.permissions || {};

  if (user.role.name === 'Admin' || permissions.isAdmin) {
    return next();
  }

  // Log unauthorized admin access attempt
  await securityService.logSecurityEvent(user.id, 'UNAUTHORIZED_ADMIN_ACCESS', {
    endpoint: req.originalUrl,
    method: req.method,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
  });

  throw new AppError('Requires administrator access', 403, 'ADMIN_ACCESS_REQUIRED');
});

/**
 * Check if user has compliance officer role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isComplianceOfficer = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (!user.role) {
    throw new AppError('No role assigned to user', 403, 'ROLE_NOT_ASSIGNED');
  }

  // Check if role has compliance officer permissions
  const permissions = user.role.permissions || {};

  if (
    user.role.name === 'Admin' ||
    user.role.name === 'Compliance Officer' ||
    permissions.isAdmin ||
    permissions.isComplianceOfficer
  ) {
    return next();
  }

  // Log unauthorized compliance access attempt
  await securityService.logSecurityEvent(user.id, 'UNAUTHORIZED_COMPLIANCE_ACCESS', {
    endpoint: req.originalUrl,
    method: req.method,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
  });

  throw new AppError('Requires compliance officer access', 403, 'COMPLIANCE_ACCESS_REQUIRED');
});

/**
 * Check if user is a department manager
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isDepartmentManager = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (!user.role) {
    throw new AppError('No role assigned to user', 403, 'ROLE_NOT_ASSIGNED');
  }

  // Check if role has department manager permissions
  const permissions = user.role.permissions || {};

  if (
    user.role.name === 'Admin' ||
    user.role.name === 'Department Manager' ||
    permissions.isAdmin ||
    permissions.isDepartmentManager
  ) {
    return next();
  }

  // Check if user is assigned as a department manager
  const department = await Department.findOne({
    where: { managerId: user.id }
  });

  if (department) {
    return next();
  }

  // Log unauthorized manager access attempt
  await securityService.logSecurityEvent(user.id, 'UNAUTHORIZED_MANAGER_ACCESS', {
    endpoint: req.originalUrl,
    method: req.method,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
  });

  throw new AppError('Requires department manager access', 403, 'MANAGER_ACCESS_REQUIRED');
});

/**
 * Check if user has compliance officer or admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isComplianceOfficerOrAdmin = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (!user.role) {
    throw new AppError('No role assigned to user', 403, 'ROLE_NOT_ASSIGNED');
  }

  // Check if role has admin or compliance officer permissions
  const permissions = user.role.permissions || {};

  if (
    user.role.name === 'Admin' ||
    user.role.name === 'Compliance Officer' ||
    permissions.isAdmin ||
    permissions.isComplianceOfficer
  ) {
    return next();
  }

  // Log unauthorized access attempt
  await securityService.logSecurityEvent(user.id, 'UNAUTHORIZED_COMPLIANCE_ACCESS', {
    endpoint: req.originalUrl,
    method: req.method,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
  });

  throw new AppError('Requires compliance officer or admin access', 403, 'COMPLIANCE_ACCESS_REQUIRED');
});

/**
 * Check if user has the required permissions for an action
 * @param {Array|String} requiredPermissions - Required permissions (can be string or array)
 * @returns {Function} Express middleware
 */
const hasPermission = (requiredPermissions) => {
  return asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!user.role) {
      throw new AppError('No role assigned to user', 403, 'ROLE_NOT_ASSIGNED');
    }

    // Admin role has all permissions
    if (user.role.name === 'Admin' || (user.role.permissions && user.role.permissions.isAdmin)) {
      return next();
    }

    // Get user permissions
    const permissions = user.role.permissions || {};
    
    // Convert single permission to array
    const required = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];

    // Check if user has any of the required permissions
    const hasRequiredPermission = required.some(perm => permissions[perm]);

    if (hasRequiredPermission) {
      return next();
    }

    // Log unauthorized access attempt
    await securityService.logSecurityEvent(user.id, 'UNAUTHORIZED_ACCESS', {
      requiredPermissions: required,
      endpoint: req.originalUrl,
      method: req.method,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
    });

    throw new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
  });
};

/**
 * Verify CSRF token for protected routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyCsrfToken = (req, res, next) => {
  // Skip CSRF check for certain routes
  const csrfExemptRoutes = [
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/verify-mfa',
    '/api/auth/verify-backup-code',
    '/api/health'
  ];
  
  if (csrfExemptRoutes.includes(req.path)) {
    return next();
  }
  
  // CSRF check handled by csurf middleware in server.js
  next();
};

const authJwt = {
  verifyToken,
  isAdmin,
  isComplianceOfficer,
  isComplianceOfficerOrAdmin,
  isDepartmentManager,
  hasPermission,
  verifyCsrfToken
};

module.exports = authJwt;