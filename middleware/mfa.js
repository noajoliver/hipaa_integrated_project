/**
 * MFA Authentication Middleware
 * @module middleware/mfa
 */
const { asyncHandler } = require('../utils/error-handler');
const { AppError } = require('../utils/error-handler');
const securityService = require('../services/security.service');

/**
 * Middleware to verify if MFA is required for a user
 * Sets req.mfaRequired flag if MFA verification is needed
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkMfaRequired = asyncHandler(async (req, res, next) => {
  const user = req.user;
  
  // Skip MFA check if no user or MFA is not enabled
  if (!user || !user.mfaEnabled) {
    req.mfaRequired = false;
    return next();
  }
  
  // Check if MFA has already been verified for this session
  if (req.session && req.session.mfaVerified) {
    req.mfaRequired = false;
    return next();
  }
  
  // MFA is required
  req.mfaRequired = true;
  next();
});

/**
 * Middleware to enforce MFA verification
 * Must be used after checkMfaRequired
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const enforceMfa = asyncHandler(async (req, res, next) => {
  // Skip if MFA is not required
  if (!req.mfaRequired) {
    return next();
  }
  
  // Check if this is an MFA verification endpoint
  const isMfaEndpoint = req.path === '/api/auth/verify-mfa' || 
                        req.path === '/api/auth/verify-backup-code';
  
  if (isMfaEndpoint) {
    return next();
  }
  
  // Block access and require MFA
  throw new AppError(
    'Multi-factor authentication required',
    403,
    'MFA_REQUIRED'
  );
});

/**
 * Middleware to verify MFA token
 * Used on the MFA verification endpoint
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyMfaToken = asyncHandler(async (req, res, next) => {
  const { token } = req.body;
  const user = req.user;
  
  if (!token) {
    throw new AppError('MFA token is required', 400, 'MFA_TOKEN_REQUIRED');
  }
  
  if (!user.mfaEnabled) {
    throw new AppError('MFA is not enabled for this user', 400, 'MFA_NOT_ENABLED');
  }
  
  // Verify token
  const isValid = securityService.verifyMFA(user, token);
  
  if (!isValid) {
    throw new AppError('Invalid MFA token', 401, 'INVALID_MFA_TOKEN');
  }
  
  // Mark MFA as verified for this session
  if (req.session) {
    req.session.mfaVerified = true;
  }
  
  next();
});

/**
 * Middleware to verify backup code
 * Used on the backup code verification endpoint
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyBackupCode = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  const user = req.user;
  
  if (!code) {
    throw new AppError('Backup code is required', 400, 'BACKUP_CODE_REQUIRED');
  }
  
  if (!user.mfaEnabled) {
    throw new AppError('MFA is not enabled for this user', 400, 'MFA_NOT_ENABLED');
  }
  
  // Use backup code
  try {
    await securityService.useBackupCode(user, code);
    
    // Mark MFA as verified for this session
    if (req.session) {
      req.session.mfaVerified = true;
    }
    
    next();
  } catch (error) {
    // Pass through AppError instances
    if (error instanceof AppError) {
      throw error;
    }
    
    // Otherwise generic error
    throw new AppError('Invalid backup code', 401, 'INVALID_BACKUP_CODE');
  }
});

module.exports = {
  checkMfaRequired,
  enforceMfa,
  verifyMfaToken,
  verifyBackupCode
};