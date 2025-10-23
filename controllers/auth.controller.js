/**
 * Authentication Controller
 * 
 * @module controllers/auth
 * @description Handles user authentication, registration, and account security functions
 */

const { User, Role, Op } = require('../models');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const { trackLoginAttempt } = require('../middleware/account-protection');
const { blacklistToken } = require('../utils/token-manager');
const { validatePassword, verifyNewPassword } = require('../utils/password-validator');
const { AppError, handleError, asyncHandler } = require('../utils/error-handler');
const { createSession, invalidateSession, getUserSessions, invalidateUserSessions } = require('../utils/session-manager');
const securityService = require('../services/security.service');
const { encrypt, decrypt } = require('../utils/encryption');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Register a new user
 * @async
 * @function register
 * 
 * @route POST /api/auth/register
 * @access Admin only
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.username - Username for the new user (3-50 characters)
 * @param {string} req.body.email - Email address of the new user
 * @param {string} req.body.password - Password (must meet security requirements)
 * @param {string} req.body.firstName - User's first name
 * @param {string} req.body.lastName - User's last name
 * @param {string} [req.body.position] - User's job position
 * @param {number} req.body.departmentId - ID of the user's department
 * @param {number} req.body.roleId - ID of the user's role
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user data or error message
 * @throws {AppError} If validation fails or user creation fails
 */
exports.register = asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  const {
    username,
    email,
    password,
    firstName,
    lastName,
    position,
    departmentId,
    roleId
  } = req.body;

  // Validate password complexity
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Password does not meet security requirements',
      errors: passwordValidation.errors
    });
  }

  // Check if username or email already exists
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [
        { username },
        { email }
      ]
    }
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Username or email already exists'
    });
  }

  // Hash password with increased cost factor (12)
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create new user with security fields
  const newUser = await User.create({
    username,
    email,
    password: hashedPassword,
    firstName,
    lastName,
    position,
    departmentId,
    roleId,
    accountStatus: 'active',
    hireDate: new Date(),
    passwordLastChanged: new Date(),
    requirePasswordChange: false,
    failedLoginAttempts: 0,
    passwordHistory: JSON.stringify([hashedPassword]),
    mfaEnabled: false,
    mfaSecret: null,
    backupCodes: null,
    securityQuestions: null,
    allowedIPs: null
  });

  // Remove sensitive data from response
  const userResponse = { ...newUser.toJSON() };
  delete userResponse.password;
  delete userResponse.mfaSecret;
  delete userResponse.backupCodes;
  delete userResponse.passwordHistory;
  delete userResponse.securityQuestions;

  // Log user creation in audit log
  if (req.auditLog) {
    await req.auditLog('USER_CREATE', 'user', newUser.id, {
      username: newUser.username,
      email: newUser.email,
      roleId: newUser.roleId,
      departmentId: newUser.departmentId
    });
  }

  return res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: userResponse
  });
});

/**
 * Login user
 * @async
 * @function login
 * 
 * @route POST /api/auth/login
 * @access Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.username - Username for authentication
 * @param {string} req.body.password - Password for authentication
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user data and session info or error message
 * @throws {AppError} If authentication fails
 */
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  // Find user by username
  const user = await User.findOne({
    where: { username },
    include: [{ model: Role, as: 'role' }]
  });

  if (!user) {
    // Track failed login attempt for non-existent user
    await trackLoginAttempt(username, false);

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if account is active
  if (user.accountStatus !== 'active') {
    let message = 'Account is not active';

    if (user.accountStatus === 'locked') {
      message = 'Account is locked. Please contact an administrator.';
    } else if (user.accountStatus === 'inactive') {
      message = 'Account has been deactivated. Please contact an administrator.';
    } else if (user.accountStatus === 'pending') {
      message = 'Account is pending approval. Please wait for activation.';
    }

    return res.status(403).json({
      success: false,
      message,
      status: user.accountStatus
    });
  }

  // Check if account is temporarily locked
  if (user.accountLockExpiresAt && new Date(user.accountLockExpiresAt) > new Date()) {
    const remainingTime = Math.ceil((new Date(user.accountLockExpiresAt) - new Date()) / 60000);
    return res.status(403).json({
      success: false,
      message: `Account is temporarily locked. Try again in ${remainingTime} minutes.`,
      status: 'locked'
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    // Track failed login attempt and potentially lock account
    await securityService.handleFailedLogin(user, ipAddress);

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check IP restrictions if enabled
  if (user.allowedIPs && user.allowedIPs.length > 0) {
    const isAllowedIP = await securityService.checkAllowedIP(user, ipAddress);
    if (!isAllowedIP) {
      // Log security event
      await securityService.logSecurityEvent(user.id, 'ACCESS_DENIED_IP', {
        ipAddress,
        userAgent
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address'
      });
    }
  }

  // Track successful login attempt
  await securityService.handleSuccessfulLogin(user, ipAddress);

  // Create user session
  const session = await createSession(
    { 
      id: user.id, 
      username: user.username, 
      roleId: user.role.id,
      roleName: user.role.name
    },
    { 
      userAgent,
      ipAddress
    }
  );

  // Update last login
  await user.update({
    lastLogin: new Date(),
    failedLoginAttempts: 0
  });

  // Remove sensitive data from response
  const userResponse = { ...user.toJSON() };
  delete userResponse.password;
  delete userResponse.mfaSecret;
  delete userResponse.backupCodes;
  delete userResponse.passwordHistory;
  delete userResponse.securityQuestions;

  // Check if password change is required
  const passwordExpired = await securityService.isPasswordExpired(user);
  const requirePasswordChange = user.requirePasswordChange || passwordExpired;

  // Set access token in HTTP-only cookie
  res.cookie('token', session.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: session.expiresIn
  });

  // Set refresh token in HTTP-only cookie
  res.cookie('refreshToken', session.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: session.refreshExpiresIn,
    path: '/api/auth/refresh' // Restrict to refresh endpoint
  });

  // Set CSRF token cookie for CSRF protection
  if (req.csrfToken) {
    res.cookie('XSRF-TOKEN', req.csrfToken(), {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }

  // Log successful login in audit log
  if (req.auditLog) {
    await req.auditLog('USER_LOGIN', 'user', user.id, {
      ipAddress,
      userAgent,
      sessionId: session.sessionId
    });
  }

  // Response varies based on MFA status
  if (user.mfaEnabled) {
    return res.status(200).json({
      success: true,
      message: 'MFA verification required',
      requireMfa: true,
      sessionId: session.sessionId,
      user: {
        id: userResponse.id,
        username: userResponse.username,
        firstName: userResponse.firstName,
        lastName: userResponse.lastName
      },
      requirePasswordChange
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: userResponse,
      requirePasswordChange,
      sessionId: session.sessionId
    }
  });
});

/**
 * Refresh access token
 * @async
 * @function refreshToken
 * 
 * @route POST /api/auth/refresh
 * @access Public (with refresh token)
 * 
 * @param {Object} req - Express request object
 * @param {string} req.cookies.refreshToken - Refresh token in cookie
 * @param {Object} req.body - Request body (optional)
 * @param {string} [req.body.refreshToken] - Refresh token (alternative to cookie)
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with new access token or error
 * @throws {AppError} If refresh token is invalid
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    const newSession = await refreshSession(refreshToken);
    
    // Set new access token in HTTP-only cookie
    res.cookie('token', newSession.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: newSession.expiresIn
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    // Clear cookies on error
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

/**
 * Verify MFA token
 * @async
 * @function verifyMfa
 * 
 * @route POST /api/auth/verify-mfa
 * @access Private (with session)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.token - 6-digit TOTP token from authenticator app
 * @param {string} req.body.sessionId - Session ID from login response
 * @param {Object} req.user - User object from JWT verification middleware
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user data or error message
 * @throws {AppError} If MFA verification fails
 */
exports.verifyMfa = asyncHandler(async (req, res) => {
  const { token, sessionId } = req.body;
  const userId = req.user.id;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'MFA token is required'
    });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (!user.mfaEnabled) {
    throw new AppError('MFA is not enabled for this user', 400, 'MFA_NOT_ENABLED');
  }

  // Verify MFA token
  const verified = await securityService.verifyMfa(user, token);
  if (!verified) {
    await securityService.handleFailedMfa(user);
    return res.status(401).json({
      success: false,
      message: 'Invalid MFA token'
    });
  }

  // Mark MFA as verified for this session
  await securityService.markMfaVerified(sessionId);

  // Get full user data for response
  const userWithRole = await User.findByPk(userId, {
    include: ['role', 'department'],
    attributes: { exclude: ['password', 'mfaSecret', 'backupCodes', 'passwordHistory', 'securityQuestions'] }
  });

  // Log MFA verification in audit log
  if (req.auditLog) {
    await req.auditLog('MFA_VERIFICATION', 'user', userId, {
      method: 'totp',
      sessionId
    });
  }

  return res.status(200).json({
    success: true,
    message: 'MFA verification successful',
    data: {
      user: userWithRole
    }
  });
});

/**
 * Verify backup code
 * @async
 * @function verifyBackupCode
 * 
 * @route POST /api/auth/verify-backup-code
 * @access Private (with session)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.code - Backup code for MFA verification
 * @param {string} req.body.sessionId - Session ID from login response
 * @param {Object} req.user - User object from JWT verification middleware
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user data or error message
 * @throws {AppError} If backup code verification fails
 */
exports.verifyBackupCode = asyncHandler(async (req, res) => {
  const { code, sessionId } = req.body;
  const userId = req.user.id;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Backup code is required'
    });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (!user.mfaEnabled) {
    throw new AppError('MFA is not enabled for this user', 400, 'MFA_NOT_ENABLED');
  }

  // Verify and consume backup code
  const verified = await securityService.useBackupCode(user, code);
  if (!verified) {
    await securityService.handleFailedMfa(user);
    return res.status(401).json({
      success: false,
      message: 'Invalid backup code'
    });
  }

  // Mark MFA as verified for this session
  await securityService.markMfaVerified(sessionId);

  // Get full user data for response
  const userWithRole = await User.findByPk(userId, {
    include: ['role', 'department'],
    attributes: { exclude: ['password', 'mfaSecret', 'backupCodes', 'passwordHistory', 'securityQuestions'] }
  });

  // Log backup code usage in audit log
  if (req.auditLog) {
    await req.auditLog('MFA_VERIFICATION', 'user', userId, {
      method: 'backup_code',
      sessionId
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Backup code verification successful',
    data: {
      user: userWithRole
    }
  });
});

/**
 * Enable MFA for user
 * @async
 * @function enableMfa
 * 
 * @route POST /api/auth/enable-mfa
 * @access Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object from JWT verification middleware
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with MFA setup data or error message
 * @throws {AppError} If MFA setup fails
 */
exports.enableMfa = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Check if MFA is already enabled
  if (user.mfaEnabled) {
    return res.status(400).json({
      success: false,
      message: 'MFA is already enabled for this user'
    });
  }

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `HIPAA App:${user.username}`
  });

  // Save encrypted secret to user
  user.mfaSecret = encrypt(secret.base32);
  await user.save();

  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  // Log MFA setup initiation in audit log
  if (req.auditLog) {
    await req.auditLog('MFA_SETUP_INITIATED', 'user', userId, {});
  }

  return res.status(200).json({
    success: true,
    message: 'MFA setup initiated',
    data: {
      qrCode,
      secret: secret.base32
    }
  });
});

/**
 * Verify and confirm MFA setup
 * @async
 * @function confirmMfa
 * 
 * @route POST /api/auth/confirm-mfa
 * @access Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.token - Verification token from authenticator app
 * @param {Object} req.user - User object from JWT verification middleware
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with backup codes or error message
 * @throws {AppError} If MFA confirmation fails
 */
exports.confirmMfa = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verification token is required'
    });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (!user.mfaSecret) {
    return res.status(400).json({
      success: false,
      message: 'MFA setup has not been initiated'
    });
  }

  // Verify token
  const verified = await securityService.verifyMfa(user, token);
  if (!verified) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification token'
    });
  }

  // Generate backup codes
  const backupCodes = await securityService.generateBackupCodes(user);

  // Log MFA enablement in audit log
  if (req.auditLog) {
    await req.auditLog('MFA_ENABLED', 'user', userId, {});
  }

  return res.status(200).json({
    success: true,
    message: 'MFA enabled successfully',
    data: {
      backupCodes
    }
  });
});

/**
 * Disable MFA for user
 * @async
 * @function disableMfa
 * 
 * @route POST /api/auth/disable-mfa
 * @access Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.token - MFA token to verify before disabling
 * @param {Object} req.user - User object from JWT verification middleware
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with success message or error
 * @throws {AppError} If MFA disablement fails
 */
exports.disableMfa = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verification token is required'
    });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (!user.mfaEnabled) {
    return res.status(400).json({
      success: false,
      message: 'MFA is not enabled for this user'
    });
  }

  // Verify token
  const verified = await securityService.verifyMfa(user, token);
  if (!verified) {
    return res.status(401).json({
      success: false,
      message: 'Invalid verification token'
    });
  }

  // Disable MFA
  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.backupCodes = null;
  await user.save();

  // Log MFA disablement in audit log
  if (req.auditLog) {
    await req.auditLog('MFA_DISABLED', 'user', userId, {});
  }

  return res.status(200).json({
    success: true,
    message: 'MFA disabled successfully'
  });
});

/**
 * Get current user profile
 * @async
 * @function getProfile
 * 
 * @route GET /api/auth/profile
 * @access Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object from JWT verification middleware
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user profile data or error message
 * @throws {AppError} If user not found
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findByPk(userId, {
    include: ['role', 'department'],
    attributes: { exclude: ['password', 'mfaSecret', 'backupCodes', 'passwordHistory', 'securityQuestions'] }
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * Change password
 * @async
 * @function changePassword
 * 
 * @route POST /api/auth/change-password
 * @access Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.currentPassword - Current password for verification
 * @param {string} req.body.newPassword - New password to set
 * @param {Object} req.user - User object from JWT verification middleware
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with success message or error
 * @throws {AppError} If password change fails
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  // Find user
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Validate new password
  const passwordValidation = verifyNewPassword(newPassword, currentPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Password does not meet security requirements',
      errors: passwordValidation.errors
    });
  }

  // Check password history
  const isPasswordReused = await securityService.checkPasswordHistory(user, newPassword);
  if (isPasswordReused) {
    return res.status(400).json({
      success: false,
      message: 'New password cannot be a previously used password'
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password and related fields
  await securityService.updatePassword(user, hashedPassword);

  // Log password change in audit log
  if (req.auditLog) {
    await req.auditLog('PASSWORD_CHANGED', 'user', userId, {});
  }

  return res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * Get active sessions for user
 * @async
 * @function getSessions
 * 
 * @route GET /api/auth/sessions
 * @access Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object from JWT verification middleware
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with sessions data or error
 */
exports.getSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const sessions = await getUserSessions(userId);

  return res.status(200).json({
    success: true,
    data: sessions
  });
});

/**
 * Revoke a specific session
 * @async
 * @function revokeSession
 * 
 * @route POST /api/auth/revoke-session
 * @access Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.sessionId - ID of the session to revoke
 * @param {Object} req.user - User object from JWT verification middleware
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with success message or error
 */
exports.revokeSession = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Session ID is required'
    });
  }

  // Get session details
  const sessions = await getUserSessions(userId);
  const targetSession = sessions.find(s => s.sessionId === sessionId);
  
  if (!targetSession) {
    return res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }

  // Revoke session
  await invalidateSession(sessionId);

  // Log session revocation in audit log
  if (req.auditLog) {
    await req.auditLog('SESSION_REVOKED', 'session', sessionId, {
      userAgent: targetSession.userAgent,
      ipAddress: targetSession.ipAddress
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Session revoked successfully'
  });
});

/**
 * Logout from all devices
 * @async
 * @function logoutAll
 * 
 * @route POST /api/auth/logout-all
 * @access Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object from JWT verification middleware
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with success message or error
 */
exports.logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Invalidate all sessions
  const count = await invalidateUserSessions(userId);

  // Clear cookies for current session
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.clearCookie('XSRF-TOKEN');

  // Log logout from all devices in audit log
  if (req.auditLog) {
    await req.auditLog('LOGOUT_ALL_DEVICES', 'user', userId, {
      sessionCount: count
    });
  }

  return res.status(200).json({
    success: true,
    message: `Logged out from all devices (${count} sessions)`,
    sessionCount: count
  });
});

/**
 * Logout user
 * @async
 * @function logout
 * 
 * @route POST /api/auth/logout
 * @access Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object from JWT verification middleware
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with success message
 */
exports.logout = asyncHandler(async (req, res) => {
  // Get session ID
  const sessionId = req.user ? req.user.sessionId : null;
  
  // Get tokens from cookies or headers
  const accessToken = req.cookies.token || (
    req.headers.authorization && req.headers.authorization.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null
  );
  
  const refreshToken = req.cookies.refreshToken;

  // Invalidate session if we have a session ID
  if (sessionId) {
    await invalidateSession(sessionId, accessToken, refreshToken);
  } else if (accessToken) {
    // Fallback to just blacklisting the token
    await blacklistToken(req.user.jti, req.user.exp);
  }

  // Clear cookies
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.clearCookie('XSRF-TOKEN');

  // Log logout in audit log
  if (req.auditLog && req.user) {
    await req.auditLog('USER_LOGOUT', 'user', req.user.id, {
      sessionId
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * CSRF token endpoint
 * @function getCsrfToken
 * 
 * @route GET /api/auth/csrf-token
 * @access Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with success message
 */
exports.getCsrfToken = (req, res) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  return res.status(200).json({
    success: true
  });
};

/**
 * Set up security questions
 * @async
 * @function setupSecurityQuestions
 * 
 * @route POST /api/auth/setup-security-questions
 * @access Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Array} req.body.questions - Array of question/answer pairs
 * @param {Object} req.user - User object from JWT verification middleware
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with success message or error
 */
exports.setupSecurityQuestions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { questions } = req.body;
  
  if (!questions || !Array.isArray(questions) || questions.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'At least 3 security questions with answers are required'
    });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Set up security questions
  await securityService.setupSecurityQuestions(user, questions);

  // Log security questions setup in audit log
  if (req.auditLog) {
    await req.auditLog('SECURITY_QUESTIONS_SETUP', 'user', userId, {
      questionCount: questions.length
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Security questions set up successfully'
  });
});

/**
 * Verify security questions
 * @async
 * @function verifySecurityQuestions
 * 
 * @route POST /api/auth/verify-security-questions
 * @access Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.username - Username to verify
 * @param {Array} req.body.answers - Array of security question answers
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with reset token or error
 */
exports.verifySecurityQuestions = asyncHandler(async (req, res) => {
  const { username, answers } = req.body;
  
  if (!username || !answers || !Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      message: 'Username and security question answers are required'
    });
  }

  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify security questions
  const verified = await securityService.verifySecurityQuestions(user, answers);
  if (!verified) {
    // Log failed security questions verification in audit log
    if (req.auditLog) {
      await req.auditLog('SECURITY_QUESTIONS_VERIFICATION_FAILED', 'user', user.id, {
        ipAddress: req.ip || req.connection.remoteAddress
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Security question verification failed'
    });
  }

  // Generate password reset token
  const resetToken = await securityService.generatePasswordResetToken(user);

  // Log successful security questions verification in audit log
  if (req.auditLog) {
    await req.auditLog('SECURITY_QUESTIONS_VERIFIED', 'user', user.id, {
      ipAddress: req.ip || req.connection.remoteAddress
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Security questions verified successfully',
    data: {
      resetToken
    }
  });
});

/**
 * Reset password with token
 * @async
 * @function resetPassword
 * 
 * @route POST /api/auth/reset-password
 * @access Public (with token)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.token - Password reset token
 * @param {string} req.body.newPassword - New password to set
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with success message or error
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Reset token and new password are required'
    });
  }

  // Verify reset token
  const userId = await securityService.verifyPasswordResetToken(token);
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Password does not meet security requirements',
      errors: passwordValidation.errors
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password and invalidate all sessions
  await securityService.resetPassword(user, hashedPassword);

  // Log password reset in audit log
  if (req.auditLog) {
    await req.auditLog('PASSWORD_RESET', 'user', userId, {
      ipAddress: req.ip || req.connection.remoteAddress
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Password reset successfully'
  });
});