/**
 * Security Service - Handles security-related operations
 * @module services/security
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { Op } = require('sequelize');
const { User, AuditLog } = require('../models');
const { logger } = require('../utils/logger');
const { AppError } = require('../utils/error-handler');
const { validatePassword } = require('../utils/password-validator');
const { encrypt, decrypt, generateToken, hashData } = require('../utils/encryption');
const { invalidateUserSessions } = require('../utils/session-manager');
const { createClient } = require('redis');
const ms = require('ms');
const ipaddr = require('ipaddr.js');

/**
 * Password management constants
 */
const PASSWORD_CONFIG = {
  // HIPAA requires regular password changes
  EXPIRY_DAYS: parseInt(process.env.PASSWORD_EXPIRY_DAYS || '90', 10),
  // HIPAA requires complex passwords
  MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH || '12', 10),
  // HIPAA requires password history
  HISTORY_SIZE: parseInt(process.env.PASSWORD_HISTORY_SIZE || '24', 10),
  // HIPAA requires account lockout
  MAX_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
  // HIPAA requires minimum lockout time
  LOCKOUT_MINUTES: parseInt(process.env.ACCOUNT_LOCKOUT_MINUTES || '30', 10)
};

// Initialize Redis client for token storage
let redisClient;
let redisConnected = false;

const initRedis = async () => {
  // Check if Redis is enabled in environment
  if (process.env.REDIS_ENABLED !== 'true') {
    logger.info('Redis support disabled - using in-memory storage for security service');
    return false;
  }
  
  try {
    // Use Redis URL from environment variable or default to localhost
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
    logger.info('Redis client connected successfully for security service');
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis for security service:', error);
    return false;
  }
};

// Initialize Redis on module load only if enabled
if (process.env.REDIS_ENABLED === 'true') {
  (async () => {
    redisConnected = await initRedis();
  })();
}

/**
 * Check and update account lockout status
 * @param {Object} user - User object to check
 * @returns {Object} Updated user object
 */
const checkAccountLock = async (user) => {
  // If account is locked, check if lock has expired
  if (user.accountStatus === 'locked' && user.accountLockExpiresAt) {
    const now = new Date();
    if (now > user.accountLockExpiresAt) {
      // Reset lock status
      user.accountStatus = 'active';
      user.failedLoginAttempts = 0;
      user.accountLockExpiresAt = null;
      await user.save();
      logger.info(`Account lock expired for user ${user.id}`);
    }
  }
  return user;
};

/**
 * Handle failed login attempt
 * Increments failed login counter and potentially locks account
 * 
 * @param {Object} user - User object
 * @param {string} ipAddress - IP address of the request
 */
const handleFailedLogin = async (user, ipAddress) => {
  try {
    // Increment failed login attempts
    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    
    // Get max failed attempts from config
    const maxFailedAttempts = PASSWORD_CONFIG.MAX_ATTEMPTS;
    
    // Get lockout duration from config
    const lockoutDuration = PASSWORD_CONFIG.LOCKOUT_MINUTES;
    
    // Update user data
    const updateData = {
      failedLoginAttempts: failedAttempts,
      lastFailedLogin: new Date()
    };
    
    // If max attempts reached, lock account temporarily
    if (failedAttempts >= maxFailedAttempts) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + lockoutDuration);
      updateData.lockUntil = lockUntil;
      updateData.accountStatus = 'locked';
      updateData.accountLockExpiresAt = lockUntil;
    }
    
    await user.update(updateData);
    
    // Log failed login attempt
    await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', {
      ipAddress,
      failedAttempts,
      isLocked: failedAttempts >= maxFailedAttempts
    });
    
    return { failedAttempts, isLocked: failedAttempts >= maxFailedAttempts };
  } catch (error) {
    logger.error('Error handling failed login:', error);
    throw error;
  }
};

/**
 * Handle successful login attempt
 * Resets failed login counter and updates last login time
 * 
 * @param {Object} user - User object
 * @param {string} ipAddress - IP address of the request
 */
const handleSuccessfulLogin = async (user, ipAddress) => {
  try {
    await user.update({
      failedLoginAttempts: 0,
      lockUntil: null,
      accountLockExpiresAt: null,
      lastLogin: new Date(),
      lastActivityAt: new Date()
    });
    
    // Log successful login
    await logSecurityEvent(user.id, 'SUCCESSFUL_LOGIN', {
      ipAddress
    });
    
    return true;
  } catch (error) {
    logger.error('Error handling successful login:', error);
    throw error;
  }
};

/**
 * Handle failed MFA attempt
 * Tracks and logs MFA verification failures
 * 
 * @param {Object} user - User object
 */
const handleFailedMfa = async (user) => {
  try {
    // Log failed MFA attempt
    await logSecurityEvent(user.id, 'FAILED_MFA_ATTEMPT', {});
    
    return true;
  } catch (error) {
    logger.error('Error handling failed MFA:', error);
    throw error;
  }
};

/**
 * Increment failed login attempts and lock account if necessary
 * @param {Object} user - User object to update
 * @returns {Object} Updated user object
 */
const incrementFailedLogin = async (user) => {
  return await handleFailedLogin(user, 'unknown');
};

/**
 * Reset failed login attempts on successful login
 * @param {Object} user - User object to update
 * @returns {Object} Updated user object
 */
const resetFailedLogin = async (user) => {
  return await handleSuccessfulLogin(user, 'unknown');
};

/**
 * Check if an IP is in the allowed list
 * 
 * @param {Object} user - User object
 * @param {string} ipAddress - IP address to check
 * @returns {boolean} Whether the IP is allowed
 */
const checkAllowedIP = async (user, ipAddress) => {
  try {
    // If no IP restrictions are set, allow access
    if (!user.ipAccessList || !Array.isArray(user.ipAccessList) || user.ipAccessList.length === 0) {
      return true;
    }
    
    // Parse the IP address
    let parsedIP;
    try {
      parsedIP = ipaddr.parse(ipAddress);
    } catch (error) {
      logger.error(`Invalid IP address format: ${ipAddress}`);
      return false;
    }
    
    // Check if the IP is in the allowed list
    for (const allowedIP of user.ipAccessList) {
      // Check for exact match
      if (allowedIP.address === ipAddress) {
        return true;
      }
      
      // Check for CIDR notation
      if (allowedIP.address.includes('/')) {
        try {
          const range = ipaddr.parseCIDR(allowedIP.address);
          if (parsedIP.kind() === range[0].kind() && parsedIP.match(range)) {
            return true;
          }
        } catch (error) {
          logger.error(`Invalid CIDR format: ${allowedIP.address}`, error);
          continue;
        }
      }
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking allowed IP:', error);
    return false;
  }
};

/**
 * Log a security event
 * 
 * @param {number} userId - User ID
 * @param {string} eventType - Security event type
 * @param {Object} details - Event details
 */
const logSecurityEvent = async (userId, eventType, details = {}) => {
  try {
    await AuditLog.create({
      userId,
      action: eventType,
      category: 'SECURITY',
      details: JSON.stringify(details),
      timestamp: new Date()
    });
    
    return true;
  } catch (error) {
    logger.error(`Error logging security event: ${eventType}`, error);
    // Don't throw as this is non-critical
    return false;
  }
};

/**
 * Check if password is expired
 * @param {Object} user - User object to check
 * @returns {boolean} Whether password is expired
 */
const isPasswordExpired = async (user) => {
  try {
    // Get last password change date (use either lastPasswordChange or passwordLastChanged)
    const lastChanged = user.passwordLastChanged || user.lastPasswordChange || null;
    
    // If no last change date, password is not expired
    if (!lastChanged) {
      return false;
    }
    
    // Get password expiration period from config
    const expiryDays = PASSWORD_CONFIG.EXPIRY_DAYS;
    
    // Check if password has expired
    const now = new Date();
    const lastChangedDate = new Date(lastChanged);
    const passwordAge = now.getTime() - lastChangedDate.getTime();
    const passwordAgeDays = passwordAge / (1000 * 60 * 60 * 24);
    
    return passwordAgeDays > expiryDays;
  } catch (error) {
    logger.error('Error checking password expiration:', error);
    return false;
  }
};

/**
 * Set password expiration for a user
 * @param {Object} user - User object to update
 * @returns {Object} Updated user object
 */
const setPasswordExpiration = async (user) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + PASSWORD_CONFIG.EXPIRY_DAYS);
  
  user.passwordExpiresAt = expiryDate;
  user.lastPasswordChange = new Date();
  user.passwordLastChanged = new Date();
  
  await user.save();
  return user;
};

/**
 * Check if a password is in the user's password history
 * 
 * @param {Object} user - User object
 * @param {string} newPassword - New password to check
 * @returns {boolean} Whether the password is in the history
 */
const checkPasswordHistory = async (user, newPassword) => {
  try {
    // Get password history (or empty array if none)
    let passwordHistory = [];
    
    if (user.passwordHistory) {
      if (typeof user.passwordHistory === 'string') {
        try {
          passwordHistory = JSON.parse(user.passwordHistory);
        } catch (e) {
          passwordHistory = [user.passwordHistory];
        }
      } else if (Array.isArray(user.passwordHistory)) {
        passwordHistory = user.passwordHistory;
      } else if (typeof user.passwordHistory === 'object') {
        passwordHistory = user.passwordHistory.map(entry => 
          typeof entry === 'object' && entry.hash ? entry.hash : entry
        );
      }
    }
    
    // Get max history size from config
    const historySize = PASSWORD_CONFIG.HISTORY_SIZE;
    
    // Check each password in history
    for (let i = 0; i < Math.min(passwordHistory.length, historySize); i++) {
      const historyEntry = typeof passwordHistory[i] === 'object' && passwordHistory[i].hash 
        ? passwordHistory[i].hash 
        : passwordHistory[i];
        
      const isMatch = await bcrypt.compare(newPassword, historyEntry);
      if (isMatch) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking password history:', error);
    return false; // Default to false on error
  }
};

/**
 * Update user password with history tracking
 * 
 * @param {Object} user - User object
 * @param {string} hashedPassword - New hashed password
 */
const updatePassword = async (user, hashedPassword) => {
  try {
    // Get current password history (or empty array if none)
    let passwordHistory = [];
    
    if (user.passwordHistory) {
      if (typeof user.passwordHistory === 'string') {
        try {
          passwordHistory = JSON.parse(user.passwordHistory);
        } catch (e) {
          passwordHistory = [user.passwordHistory];
        }
      } else if (Array.isArray(user.passwordHistory)) {
        passwordHistory = user.passwordHistory;
      }
    }
    
    // Get max history size from config
    const historySize = PASSWORD_CONFIG.HISTORY_SIZE;
    
    // Add current password to history
    if (user.password) {
      if (typeof passwordHistory[0] === 'object' && 'hash' in passwordHistory[0]) {
        // Format is array of objects with hash property
        passwordHistory.unshift({
          hash: user.password,
          changedAt: new Date().toISOString()
        });
      } else {
        // Format is array of hashed passwords
        passwordHistory.unshift(user.password);
      }
    }
    
    // Trim history to max size
    passwordHistory = passwordHistory.slice(0, historySize);
    
    // Update user
    await user.update({
      password: hashedPassword,
      passwordLastChanged: new Date(),
      lastPasswordChange: new Date(), // Support both field names
      requirePasswordChange: false,
      passwordHistory: JSON.stringify(passwordHistory),
      
      // Set password expiration
      passwordExpiresAt: new Date(Date.now() + (PASSWORD_CONFIG.EXPIRY_DAYS * 24 * 60 * 60 * 1000))
    });
    
    // Log password update
    await logSecurityEvent(user.id, 'PASSWORD_UPDATED', {
      expiresAt: user.passwordExpiresAt
    });
    
    return true;
  } catch (error) {
    logger.error('Error updating password:', error);
    throw error;
  }
};

/**
 * Update password and manage password history
 * @param {Object} user - User object to update
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} Updated user object
 */
const changePassword = async (user, currentPassword, newPassword) => {
  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
  }
  
  // Validate new password meets requirements
  const validation = validatePassword(newPassword, {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email
  });
  
  if (!validation.isValid) {
    throw new AppError(validation.message, 400, 'PASSWORD_VALIDATION_ERROR');
  }
  
  // Check if password is in history
  const isInHistory = await checkPasswordHistory(user, newPassword);
  if (isInHistory) {
    throw new AppError(
      `Cannot reuse any of your last ${PASSWORD_CONFIG.HISTORY_SIZE} passwords`,
      400,
      'PASSWORD_HISTORY_ERROR'
    );
  }
  
  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  // Update password
  await updatePassword(user, hashedPassword);
  
  return user;
};

/**
 * Force password reset for a user
 * @param {number} userId - User ID to reset password for
 * @returns {Object} Updated user object
 */
const forcePasswordReset = async (userId) => {
  const user = await User.findByPk(userId);
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  user.requirePasswordChange = true;
  await user.save();
  
  // Log forced password reset
  await logSecurityEvent(user.id, 'FORCED_PASSWORD_RESET', {
    enforcedBy: 'admin'
  });
  
  return user;
};

/**
 * Reset user password and invalidate all sessions
 * 
 * @param {Object} user - User object
 * @param {string} hashedPassword - New hashed password
 */
const resetPassword = async (user, hashedPassword) => {
  try {
    // Update password
    await updatePassword(user, hashedPassword);
    
    // Invalidate all user sessions
    await invalidateUserSessions(user.id);
    
    // Log password reset
    await logSecurityEvent(user.id, 'PASSWORD_RESET', {});
    
    return true;
  } catch (error) {
    logger.error('Error resetting password:', error);
    throw error;
  }
};

/**
 * Generate a password reset token
 * 
 * @param {Object} user - User object
 * @returns {string} Reset token
 */
const generatePasswordResetToken = async (user) => {
  try {
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set token expiration (15 minutes)
    const expires = Date.now() + (15 * 60 * 1000);
    
    // Store token in Redis with expiration
    if (redisConnected && redisClient.isReady) {
      await redisClient.set(
        `reset:${token}`,
        user.id.toString(),
        { EX: 900 } // 15 minutes in seconds
      );
    } else {
      // Fallback to storing in user object if Redis not available
      await user.update({
        resetToken: token,
        resetTokenExpires: new Date(expires)
      });
    }
    
    // Log token generation
    await logSecurityEvent(user.id, 'RESET_TOKEN_GENERATED', {});
    
    return token;
  } catch (error) {
    logger.error('Error generating reset token:', error);
    throw error;
  }
};

/**
 * Verify a password reset token
 * 
 * @param {string} token - Reset token
 * @returns {number|null} User ID if valid, null if invalid
 */
const verifyPasswordResetToken = async (token) => {
  try {
    let userId = null;
    
    // Check Redis first
    if (redisConnected && redisClient.isReady) {
      userId = await redisClient.get(`reset:${token}`);
      
      if (userId) {
        // Delete token after use
        await redisClient.del(`reset:${token}`);
        return parseInt(userId, 10);
      }
    }
    
    // Fallback to database check
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpires: { [Op.gt]: new Date() }
      }
    });
    
    if (user) {
      // Clear token after use
      await user.update({
        resetToken: null,
        resetTokenExpires: null
      });
      
      return user.id;
    }
    
    return null;
  } catch (error) {
    logger.error('Error verifying reset token:', error);
    return null;
  }
};

/**
 * Setup MFA for a user
 * @param {Object} user - User object to set up MFA for
 * @returns {Object} MFA setup information
 */
const setupMFA = async (user) => {
  // Generate new secret
  const secret = speakeasy.generateSecret({
    name: `HIPAA Compliance App (${user.username})`,
    issuer: 'HIPAA Compliance App'
  });
  
  // Create QR code for secret
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
  
  // Update user with encrypted secret
  user.mfaSecret = encrypt(secret.base32);
  await user.save();
  
  return {
    secret: secret.base32,
    qrCode: qrCodeUrl
  };
};

/**
 * Verify MFA token
 * @param {Object} user - User object to verify MFA for
 * @param {string} token - MFA token to verify
 * @returns {boolean} Whether token is valid
 */
const verifyMfa = async (user, token) => {
  try {
    // Check if MFA is enabled
    if (!user.mfaEnabled || !user.mfaSecret) {
      return false;
    }
    
    // Handle encrypted MFA secret
    let secret = user.mfaSecret;
    try {
      secret = decrypt(user.mfaSecret);
    } catch (error) {
      // If decryption fails, assume it's not encrypted
      logger.warn(`Failed to decrypt MFA secret for user ${user.id}, assuming unencrypted format`);
    }
    
    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Allow 1 period before/after for clock drift
    });
    
    if (verified) {
      // Log successful verification
      await logSecurityEvent(user.id, 'MFA_VERIFIED', {});
    }
    
    return verified;
  } catch (error) {
    logger.error('Error verifying MFA token:', error);
    return false;
  }
};

/**
 * Generate backup codes for a user
 * 
 * @param {Object} user - User object
 * @returns {Array} Array of backup codes
 */
const generateBackupCodes = async (user) => {
  try {
    // Generate 10 random backup codes
    const codes = Array(10).fill().map(() => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    
    // Hash each code
    const hashedCodes = await Promise.all(codes.map(async (code) => {
      const hash = await bcrypt.hash(code, 5); // Light hashing for backup codes
      return { code: hash, used: false };
    }));
    
    // Store hashed codes and enable MFA
    await user.update({
      backupCodes: JSON.stringify(hashedCodes),
      recoveryBackupCodes: hashedCodes,
      mfaEnabled: true
    });
    
    // Log MFA enablement
    await logSecurityEvent(user.id, 'MFA_ENABLED', {
      backupCodesGenerated: codes.length
    });
    
    return codes;
  } catch (error) {
    logger.error('Error generating backup codes:', error);
    throw error;
  }
};

/**
 * Verify and enable MFA for a user
 * @param {Object} user - User object to enable MFA for
 * @param {string} secret - MFA secret to store
 * @param {string} token - MFA token to verify
 * @returns {Object} Updated user object and backup codes
 */
const enableMFA = async (user, secret, token) => {
  // Verify token
  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1
  });
  
  if (!verified) {
    throw new AppError('Invalid MFA token', 400, 'INVALID_MFA_TOKEN');
  }
  
  // Generate backup recovery codes
  const backupCodes = await generateBackupCodes(user);
  
  return { 
    user,
    backupCodes  // Return plain backup codes to show to user
  };
};

/**
 * Disable MFA for a user
 * @param {Object} user - User object to disable MFA for
 * @param {string} token - MFA token to verify before disabling
 * @returns {Object} Updated user object
 */
const disableMFA = async (user, token) => {
  if (!user.mfaEnabled) {
    throw new AppError('MFA is not enabled for this user', 400, 'MFA_NOT_ENABLED');
  }
  
  // Verify token
  const isValid = await verifyMfa(user, token);
  
  if (!isValid) {
    throw new AppError('Invalid MFA token', 400, 'INVALID_MFA_TOKEN');
  }
  
  // Disable MFA
  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.backupCodes = null;
  user.recoveryBackupCodes = [];
  
  await user.save();
  
  // Log MFA disablement
  await logSecurityEvent(user.id, 'MFA_DISABLED', {});
  
  return user;
};

/**
 * Use a recovery backup code
 * @param {Object} user - User object to use backup code for
 * @param {string} code - Backup code to use
 * @returns {Object} Updated user object
 */
const useBackupCode = async (user, code) => {
  try {
    // Check if MFA is enabled
    if (!user.mfaEnabled) {
      throw new AppError('MFA is not enabled for this user', 400, 'MFA_NOT_ENABLED');
    }
    
    // Check for backup codes in different formats
    let backupCodes = [];
    
    if (user.backupCodes) {
      try {
        backupCodes = JSON.parse(user.backupCodes);
      } catch (e) {
        logger.error('Error parsing backupCodes', e);
      }
    } else if (user.recoveryBackupCodes) {
      backupCodes = user.recoveryBackupCodes;
    }
    
    if (!backupCodes || backupCodes.length === 0) {
      throw new AppError('No backup codes available', 400, 'NO_BACKUP_CODES');
    }
    
    // Normalize code
    const normalizedCode = code.toUpperCase().replace(/[^0-9A-F]/g, '');
    
    // Check if code matches any of the backup codes
    let codeFound = false;
    let updatedCodes = [...backupCodes];
    
    for (let i = 0; i < updatedCodes.length; i++) {
      if (updatedCodes[i].used) continue;
      
      const isMatch = await bcrypt.compare(normalizedCode, updatedCodes[i].code);
      if (isMatch) {
        updatedCodes[i].used = true;
        codeFound = true;
        break;
      }
    }
    
    if (!codeFound) {
      throw new AppError('Invalid or already used backup code', 400, 'INVALID_BACKUP_CODE');
    }
    
    // Update user with marked code
    if (user.backupCodes) {
      user.backupCodes = JSON.stringify(updatedCodes);
    }
    if (user.recoveryBackupCodes) {
      user.recoveryBackupCodes = updatedCodes;
    }
    
    await user.save();
    
    // Log backup code use
    await logSecurityEvent(user.id, 'BACKUP_CODE_USED', {
      remainingCodes: updatedCodes.filter(c => !c.used).length
    });
    
    return true;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Error verifying backup code:', error);
    return false;
  }
};

/**
 * Mark MFA as verified for a session
 * 
 * @param {string} sessionId - Session ID
 * @returns {boolean} Success status
 */
const markMfaVerified = async (sessionId) => {
  if (!sessionId) {
    return false;
  }
  
  if (redisConnected && redisClient.isReady) {
    try {
      // Get current session data
      const sessionKey = `session:${sessionId}`;
      const sessionData = await redisClient.get(sessionKey);
      
      if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // Mark MFA as verified
        session.mfaVerified = true;
        
        // Calculate remaining time
        const ttl = await redisClient.ttl(sessionKey);
        
        // Update session
        if (ttl > 0) {
          await redisClient.set(
            sessionKey, 
            JSON.stringify(session), 
            { EX: ttl }
          );
          return true;
        }
      }
    } catch (error) {
      logger.error('Error marking MFA verified:', error);
    }
  }
  
  return false;
};

/**
 * Set up security questions for a user
 * 
 * @param {Object} user - User object
 * @param {Array} questions - Array of {question, answer} objects
 */
const setupSecurityQuestions = async (user, questions) => {
  try {
    // Validate questions
    if (!Array.isArray(questions) || questions.length < 3) {
      throw new AppError('At least 3 security questions are required', 400, 'INVALID_SECURITY_QUESTIONS');
    }
    
    // Hash answers
    const securityQuestions = await Promise.all(questions.map(async (q) => {
      return {
        question: q.question,
        answer: await bcrypt.hash(q.answer.toLowerCase().trim(), 5) // Normalize and hash answers
      };
    }));
    
    // Store questions
    user.securityQuestions = securityQuestions;
    await user.save();
    
    // Log setup
    await logSecurityEvent(user.id, 'SECURITY_QUESTIONS_SETUP', {
      questionCount: securityQuestions.length
    });
    
    return true;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Error setting up security questions:', error);
    throw error;
  }
};

/**
 * Verify security question answers
 * 
 * @param {Object} user - User object
 * @param {Array} answers - Array of {question, answer} pairs
 * @returns {boolean} Whether answers are correct
 */
const verifySecurityQuestions = async (user, answers) => {
  try {
    if (!user.securityQuestions || user.securityQuestions.length === 0) {
      throw new AppError('No security questions are set for this user', 400, 'NO_SECURITY_QUESTIONS');
    }
    
    if (!Array.isArray(answers) || answers.length === 0) {
      return false;
    }
    
    // Need to match at least 2 questions correctly
    let correctAnswers = 0;
    const requiredCorrect = Math.min(2, user.securityQuestions.length);
    
    for (const answer of answers) {
      const question = user.securityQuestions.find(q => q.question === answer.question);
      if (!question) continue;
      
      const isMatch = await bcrypt.compare(answer.answer.toLowerCase().trim(), question.answer);
      if (isMatch) {
        correctAnswers++;
      }
      
      if (correctAnswers >= requiredCorrect) {
        // Log successful verification
        await logSecurityEvent(user.id, 'SECURITY_QUESTIONS_VERIFIED', {
          correctAnswers
        });
        return true;
      }
    }
    
    // Log failed verification
    await logSecurityEvent(user.id, 'SECURITY_QUESTIONS_VERIFICATION_FAILED', {
      correctAnswers
    });
    
    return false;
  } catch (error) {
    logger.error('Error verifying security questions:', error);
    return false;
  }
};

/**
 * Add IP address to allowlist for a user
 * @param {Object} user - User object to add IP to
 * @param {string} ipAddress - IP address to add
 * @param {string} description - Description of the IP address
 * @returns {Object} Updated user object
 */
const addIpToAllowlist = async (user, ipAddress, description = '') => {
  // Validate IP address format
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ipAddress)) {
    throw new AppError('Invalid IP address format', 400, 'INVALID_IP_FORMAT');
  }
  
  // Initialize IP list if not exists
  const ipList = user.ipAccessList || [];
  
  // Check if IP already exists
  if (ipList.some(ip => ip.address === ipAddress)) {
    throw new AppError('IP address already in allowlist', 400, 'IP_ALREADY_EXISTS');
  }
  
  // Add new IP
  ipList.push({
    address: ipAddress,
    description,
    addedAt: new Date()
  });
  
  user.ipAccessList = ipList;
  await user.save();
  
  // Log IP addition
  await logSecurityEvent(user.id, 'IP_ALLOWLIST_ADDITION', {
    ipAddress,
    description
  });
  
  return user;
};

/**
 * Check if an IP address is allowed for a user
 * @param {Object} user - User object to check
 * @param {string} ipAddress - IP address to check
 * @returns {boolean} Whether IP is allowed
 */
const isIpAllowed = (user, ipAddress) => {
  // If user doesn't have IP restrictions, all IPs are allowed
  if (!user.ipAccessList || user.ipAccessList.length === 0) {
    return true;
  }
  
  // Check if IP is in the allowlist
  return user.ipAccessList.some(ip => ip.address === ipAddress);
};

/**
 * Remove IP address from allowlist for a user
 * @param {Object} user - User object to remove IP from
 * @param {string} ipAddress - IP address to remove
 * @returns {Object} Updated user object
 */
const removeIpFromAllowlist = async (user, ipAddress) => {
  if (!user.ipAccessList || user.ipAccessList.length === 0) {
    throw new AppError('No IP addresses in allowlist', 400, 'EMPTY_IP_LIST');
  }
  
  const initialLength = user.ipAccessList.length;
  
  user.ipAccessList = user.ipAccessList.filter(ip => ip.address !== ipAddress);
  
  if (user.ipAccessList.length === initialLength) {
    throw new AppError('IP address not found in allowlist', 404, 'IP_NOT_FOUND');
  }
  
  await user.save();
  
  // Log IP removal
  await logSecurityEvent(user.id, 'IP_ALLOWLIST_REMOVAL', {
    ipAddress
  });
  
  return user;
};

/**
 * Audit user security status
 * @param {Object} user - User object to audit
 * @returns {Object} Security audit results
 */
const auditUserSecurity = (user) => {
  const now = new Date();
  
  return {
    passwordStatus: {
      daysSinceLastChange: user.lastPasswordChange || user.passwordLastChanged
        ? Math.floor((now - new Date(user.lastPasswordChange || user.passwordLastChanged)) / (1000 * 60 * 60 * 24)) 
        : null,
      isExpired: isPasswordExpired(user),
      expiresIn: user.passwordExpiresAt 
        ? Math.floor((new Date(user.passwordExpiresAt) - now) / (1000 * 60 * 60 * 24)) 
        : null,
      changeRequired: user.requirePasswordChange
    },
    mfaStatus: {
      enabled: user.mfaEnabled,
      backupCodesRemaining: (user.backupCodes && JSON.parse(user.backupCodes).filter(code => !code.used).length) ||
                            (user.recoveryBackupCodes ? user.recoveryBackupCodes.filter(code => !code.used).length : 0)
    },
    securityQuestions: {
      configured: user.securityQuestions && user.securityQuestions.length > 0,
      count: user.securityQuestions ? user.securityQuestions.length : 0
    },
    ipRestrictions: {
      enabled: user.ipAccessList && user.ipAccessList.length > 0,
      allowedIpCount: user.ipAccessList ? user.ipAccessList.length : 0
    },
    accountStatus: {
      status: user.accountStatus,
      locked: user.accountStatus === 'locked',
      failedLoginAttempts: user.failedLoginAttempts || 0,
      lockExpiresIn: user.accountLockExpiresAt 
        ? Math.floor((new Date(user.accountLockExpiresAt) - now) / (1000 * 60)) 
        : null
    }
  };
};

module.exports = {
  // Account lockout management
  checkAccountLock,
  incrementFailedLogin,
  resetFailedLogin,
  handleFailedLogin,
  handleSuccessfulLogin,
  handleFailedMfa,
  checkAllowedIP,
  logSecurityEvent,
  
  // Password management
  isPasswordExpired,
  setPasswordExpiration,
  checkPasswordHistory,
  updatePassword,
  changePassword,
  forcePasswordReset,
  resetPassword,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  
  // Multi-factor authentication
  setupMFA,
  enableMFA,
  disableMFA,
  verifyMfa,
  generateBackupCodes,
  useBackupCode,
  markMfaVerified,
  
  // Security questions
  setupSecurityQuestions,
  verifySecurityQuestions,
  
  // IP allowlist management
  addIpToAllowlist,
  isIpAllowed,
  removeIpFromAllowlist,
  
  // Security audit
  auditUserSecurity
};