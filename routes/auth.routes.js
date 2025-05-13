/**
 * Authentication Routes
 * @module routes/auth.routes
 */
const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authJwt = require('../middleware/auth.jwt');
const { authLimiter, strictLimiter } = require('../middleware/rate-limit');
const { checkAccountLock } = require('../middleware/account-protection');
const { checkMfaRequired, enforceMfa, verifyMfaToken, verifyBackupCode } = require('../middleware/mfa');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Admin only
 */
router.post('/register', [
  // Authorization middleware
  authJwt.verifyToken,
  authJwt.isAdmin,
  
  // Validation middleware
  check('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Username can only contain letters, numbers, and ._-'),
  check('email')
    .isEmail()
    .withMessage('Must be a valid email address'),
  check('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  check('firstName')
    .notEmpty()
    .withMessage('First name is required'),
  check('lastName')
    .notEmpty()
    .withMessage('Last name is required'),
], authController.register);

/**
 * @route POST /api/auth/login
 * @desc Login user and get token
 * @access Public
 */
router.post('/login', [
  // Rate limiting middleware
  authLimiter,
  
  // Account lockout check
  checkAccountLock,
  
  // Validation middleware
  check('username')
    .notEmpty()
    .withMessage('Username is required'),
  check('password')
    .notEmpty()
    .withMessage('Password is required'),
], authController.login);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public (with refresh token)
 */
router.post('/refresh', [
  // Rate limiting middleware
  authLimiter,
], authController.refreshToken);

/**
 * @route POST /api/auth/verify-mfa
 * @desc Verify MFA token
 * @access Private (with session)
 */
router.post('/verify-mfa', [
  // Authorization middleware - preliminary JWT check
  authJwt.verifyToken,
  
  // Rate limiting middleware
  strictLimiter,
  
  // MFA validation middleware
  check('token')
    .notEmpty()
    .withMessage('MFA token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('MFA token must be 6 digits')
    .isNumeric()
    .withMessage('MFA token must contain only numbers'),
], authController.verifyMfa);

/**
 * @route POST /api/auth/verify-backup-code
 * @desc Verify backup code for MFA
 * @access Private (with session)
 */
router.post('/verify-backup-code', [
  // Authorization middleware - preliminary JWT check
  authJwt.verifyToken,
  
  // Rate limiting middleware
  strictLimiter,
  
  // Validation middleware
  check('code')
    .notEmpty()
    .withMessage('Backup code is required'),
], authController.verifyBackupCode);

/**
 * @route POST /api/auth/enable-mfa
 * @desc Enable MFA for user
 * @access Private
 */
router.post('/enable-mfa', [
  // Authorization middleware
  authJwt.verifyToken,
  
  // Rate limiting for sensitive operations
  strictLimiter,
], authController.enableMfa);

/**
 * @route POST /api/auth/confirm-mfa
 * @desc Confirm MFA setup with verification token
 * @access Private
 */
router.post('/confirm-mfa', [
  // Authorization middleware
  authJwt.verifyToken,
  
  // Rate limiting for sensitive operations
  strictLimiter,
  
  // Validation middleware
  check('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification token must be 6 digits')
    .isNumeric()
    .withMessage('Verification token must contain only numbers'),
], authController.confirmMfa);

/**
 * @route POST /api/auth/disable-mfa
 * @desc Disable MFA for user
 * @access Private
 */
router.post('/disable-mfa', [
  // Authorization middleware
  authJwt.verifyToken,
  
  // Rate limiting for sensitive operations
  strictLimiter,
  
  // Validation middleware
  check('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification token must be 6 digits')
    .isNumeric()
    .withMessage('Verification token must contain only numbers'),
], authController.disableMfa);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', [
  // Authorization middleware
  authJwt.verifyToken,
  
  // MFA middleware
  checkMfaRequired,
  enforceMfa
], authController.getProfile);

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', [
  // Authorization middleware
  authJwt.verifyToken,
  
  // MFA middleware
  checkMfaRequired,
  enforceMfa,
  
  // Rate limiting for sensitive operations
  strictLimiter,
  
  // Validation middleware
  check('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  check('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long'),
], authController.changePassword);

/**
 * @route GET /api/auth/sessions
 * @desc Get user's active sessions
 * @access Private
 */
router.get('/sessions', [
  // Authorization middleware
  authJwt.verifyToken,
  
  // MFA middleware
  checkMfaRequired,
  enforceMfa,
], authController.getSessions);

/**
 * @route POST /api/auth/revoke-session
 * @desc Revoke a specific session
 * @access Private
 */
router.post('/revoke-session', [
  // Authorization middleware
  authJwt.verifyToken,
  
  // MFA middleware
  checkMfaRequired,
  enforceMfa,
  
  // Rate limiting for sensitive operations
  strictLimiter,
  
  // Validation middleware
  check('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
], authController.revokeSession);

/**
 * @route POST /api/auth/logout-all
 * @desc Logout from all devices
 * @access Private
 */
router.post('/logout-all', [
  // Authorization middleware
  authJwt.verifyToken,
  
  // Rate limiting for sensitive operations
  strictLimiter,
], authController.logoutAll);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', [
  // Authorization middleware
  authJwt.verifyToken
], authController.logout);

/**
 * @route GET /api/auth/csrf-token
 * @desc Get CSRF token
 * @access Public
 */
router.get('/csrf-token', authController.getCsrfToken);

/**
 * @route POST /api/auth/setup-security-questions
 * @desc Set up security questions for account recovery
 * @access Private
 */
router.post('/setup-security-questions', [
  // Authorization middleware
  authJwt.verifyToken,
  
  // MFA middleware
  checkMfaRequired,
  enforceMfa,
  
  // Rate limiting for sensitive operations
  strictLimiter,
], authController.setupSecurityQuestions);

/**
 * @route POST /api/auth/verify-security-questions
 * @desc Verify security questions for password reset
 * @access Public
 */
router.post('/verify-security-questions', [
  // Rate limiting middleware
  strictLimiter,
  
  // Validation middleware
  check('username')
    .notEmpty()
    .withMessage('Username is required'),
  check('answers')
    .isArray({ min: 3 })
    .withMessage('At least 3 security question answers are required'),
], authController.verifySecurityQuestions);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public (with token)
 */
router.post('/reset-password', [
  // Rate limiting middleware
  strictLimiter,
  
  // Validation middleware
  check('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  check('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long'),
], authController.resetPassword);

module.exports = router;