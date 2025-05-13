/**
 * Account Protection Middleware - Prevents brute force attacks and enforces security policies
 * @module middleware/account-protection
 */
const { User } = require('../models');
const { AppError } = require('../utils/error-handler');

// In-memory store for login attempt tracking (replace with Redis in production)
const loginAttempts = new Map();

/**
 * Track failed login attempts and implement account lockouts
 * @param {string} username - The username being attempted
 * @param {boolean} success - Whether the login attempt was successful
 * @returns {Promise<void>}
 */
const trackLoginAttempt = async (username, success) => {
  if (!username) return;
  
  const key = username.toLowerCase();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5; // Lock after 5 failed attempts
  
  // Get current attempts or initialize
  let attempts = loginAttempts.get(key) || { count: 0, timestamps: [], lockedUntil: null };
  
  // Clean up old attempts outside the window
  attempts.timestamps = attempts.timestamps.filter(time => now - time < windowMs);
  
  if (success) {
    // Successful login resets attempts
    attempts = { count: 0, timestamps: [], lockedUntil: null };
    
    // If account was locked due to failed attempts, update in database
    await User.update(
      { accountStatus: 'active', lockedReason: null },
      { where: { username, accountStatus: 'locked', lockedReason: 'failed_attempts' }}
    );
  } else {
    // Increment failed attempts
    attempts.count = attempts.timestamps.length + 1;
    attempts.timestamps.push(now);
    
    // Lock account if max attempts reached
    if (attempts.count >= maxAttempts) {
      const lockDuration = 30 * 60 * 1000; // 30 minutes
      attempts.lockedUntil = now + lockDuration;
      
      // Update database to reflect locked status
      await User.update(
        { 
          accountStatus: 'locked', 
          lockedReason: 'failed_attempts', 
          lockedUntil: new Date(attempts.lockedUntil)
        },
        { where: { username }}
      );
    }
  }
  
  // Update in-memory store
  loginAttempts.set(key, attempts);
};

/**
 * Check if an account is locked due to failed attempts
 * @param {string} username - The username to check
 * @returns {Promise<boolean>} - True if the account is locked
 */
const isAccountLocked = async (username) => {
  if (!username) return false;
  
  const key = username.toLowerCase();
  const attempts = loginAttempts.get(key);
  
  // If no attempts record or no lock, check the database
  if (!attempts || !attempts.lockedUntil) {
    const user = await User.findOne({ 
      where: { username },
      attributes: ['accountStatus', 'lockedUntil', 'lockedReason']
    });
    
    if (!user) return false;
    
    // If locked in database but not in memory, add to memory
    if (user.accountStatus === 'locked' && user.lockedReason === 'failed_attempts') {
      const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil).getTime() : null;
      
      // If lock has expired, unlock in database
      if (lockedUntil && lockedUntil < Date.now()) {
        await User.update(
          { accountStatus: 'active', lockedReason: null, lockedUntil: null },
          { where: { username }}
        );
        return false;
      }
      
      // Update in-memory store
      loginAttempts.set(key, { 
        count: 5, 
        timestamps: [], 
        lockedUntil 
      });
      
      return true;
    }
    
    return false;
  }
  
  // Check if lock has expired
  if (attempts.lockedUntil < Date.now()) {
    // Reset attempts on expiration
    loginAttempts.set(key, { count: 0, timestamps: [], lockedUntil: null });
    
    // Update database to reflect unlocked status
    await User.update(
      { accountStatus: 'active', lockedReason: null, lockedUntil: null },
      { where: { username, accountStatus: 'locked', lockedReason: 'failed_attempts' }}
    );
    
    return false;
  }
  
  return true;
};

/**
 * Get remaining lockout time in seconds
 * @param {string} username - The username to check
 * @returns {Promise<number>} - Remaining lock time in seconds, 0 if not locked
 */
const getRemainingLockTime = async (username) => {
  if (!username) return 0;
  
  const key = username.toLowerCase();
  const attempts = loginAttempts.get(key);
  
  if (!attempts || !attempts.lockedUntil) {
    const user = await User.findOne({ 
      where: { username },
      attributes: ['accountStatus', 'lockedUntil', 'lockedReason']
    });
    
    if (!user || user.accountStatus !== 'locked' || user.lockedReason !== 'failed_attempts') {
      return 0;
    }
    
    const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil).getTime() : null;
    if (!lockedUntil) return 0;
    
    const remainingMs = Math.max(0, lockedUntil - Date.now());
    return Math.ceil(remainingMs / 1000);
  }
  
  const remainingMs = Math.max(0, attempts.lockedUntil - Date.now());
  return Math.ceil(remainingMs / 1000);
};

/**
 * Middleware to check for account locked status before authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkAccountLock = async (req, res, next) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return next(new AppError('Username is required', 400, 'VALIDATION_ERROR'));
    }
    
    // Check if account is locked
    const locked = await isAccountLocked(username);
    
    if (locked) {
      const remainingSeconds = await getRemainingLockTime(username);
      return next(new AppError(
        `Account is temporarily locked due to too many failed attempts. Try again in ${Math.ceil(remainingSeconds / 60)} minutes.`,
        403,
        'ACCOUNT_LOCKED'
      ));
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  trackLoginAttempt,
  isAccountLocked,
  getRemainingLockTime,
  checkAccountLock
};