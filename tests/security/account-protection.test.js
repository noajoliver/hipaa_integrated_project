/**
 * Tests for the account protection functionality
 */
const {
  trackLoginAttempt,
  isAccountLocked,
  getRemainingLockTime,
  checkAccountLock
} = require('../../middleware/account-protection');

// Mock the User model
jest.mock('../../models', () => {
  const mockUser = {
    update: jest.fn().mockResolvedValue(true),
    findOne: jest.fn().mockImplementation(({ where }) => {
      // If checking for a locked user, return locked status
      if (where && where.username === 'locked_user') {
        return Promise.resolve({
          accountStatus: 'locked',
          lockedReason: 'failed_attempts',
          lockedUntil: new Date(Date.now() + 1000 * 60 * 30) // 30 minutes in the future
        });
      }
      return Promise.resolve(null);
    })
  };

  return {
    User: mockUser
  };
});

// Mock the error handler
jest.mock('../../utils/error-handler', () => {
  const AppError = class extends Error {
    constructor(message, statusCode, errorCode) {
      super(message);
      this.statusCode = statusCode;
      this.errorCode = errorCode;
    }
  };
  
  return {
    AppError
  };
});

describe('Account Protection Middleware', () => {
  beforeEach(() => {
    // Clear login attempts map before each test
    global.loginAttempts = new Map();
    jest.clearAllMocks();
  });
  
  describe('trackLoginAttempt', () => {
    it('should track failed login attempts', async () => {
      const username = 'test_user';
      
      // First failed attempt
      await trackLoginAttempt(username, false);
      
      // Check the in-memory store
      const attempts = global.loginAttempts.get(username.toLowerCase());
      expect(attempts).toBeDefined();
      expect(attempts.count).toBe(1);
      expect(attempts.timestamps.length).toBe(1);
      expect(attempts.lockedUntil).toBeNull();
    });
    
    it('should track multiple failed login attempts', async () => {
      const username = 'test_user';
      
      // Make multiple failed attempts
      await trackLoginAttempt(username, false);
      await trackLoginAttempt(username, false);
      await trackLoginAttempt(username, false);
      
      // Check the in-memory store
      const attempts = global.loginAttempts.get(username.toLowerCase());
      expect(attempts).toBeDefined();
      expect(attempts.count).toBe(3);
      expect(attempts.timestamps.length).toBe(3);
      expect(attempts.lockedUntil).toBeNull();
    });
    
    it('should reset attempts after successful login', async () => {
      const username = 'test_user';
      
      // Make failed attempts
      await trackLoginAttempt(username, false);
      await trackLoginAttempt(username, false);
      
      // Successful login
      await trackLoginAttempt(username, true);
      
      // Check the in-memory store
      const attempts = global.loginAttempts.get(username.toLowerCase());
      expect(attempts).toBeDefined();
      expect(attempts.count).toBe(0);
      expect(attempts.timestamps.length).toBe(0);
      expect(attempts.lockedUntil).toBeNull();
    });
    
    it('should lock an account after max failed attempts', async () => {
      const username = 'test_user';
      const { User } = require('../../models');
      
      // Make max failed attempts (5)
      await trackLoginAttempt(username, false);
      await trackLoginAttempt(username, false);
      await trackLoginAttempt(username, false);
      await trackLoginAttempt(username, false);
      await trackLoginAttempt(username, false);
      
      // Check the in-memory store
      const attempts = global.loginAttempts.get(username.toLowerCase());
      expect(attempts).toBeDefined();
      expect(attempts.count).toBe(5);
      expect(attempts.lockedUntil).not.toBeNull();
      
      // Verify user update was called to lock the account
      expect(User.update).toHaveBeenCalledWith(
        expect.objectContaining({
          accountStatus: 'locked',
          lockedReason: 'failed_attempts'
        }),
        expect.any(Object)
      );
    });
  });
  
  describe('isAccountLocked', () => {
    beforeEach(() => {
      // Clear login attempts map before each test
      global.loginAttempts = new Map();
    });

    it('should return false for non-existent users', async () => {
      const username = 'non_existent_user';
      const result = await isAccountLocked(username);
      expect(result).toBe(false);
    });

    it('should return false for users with no failed attempts', async () => {
      // Reset login attempts map to ensure it's empty
      global.loginAttempts = new Map();

      const username = 'test_user';
      const result = await isAccountLocked(username);
      expect(result).toBe(false);
    });

    it('should return true for locked accounts in database', async () => {
      const username = 'locked_user';
      const result = await isAccountLocked(username);
      expect(result).toBe(true);
    });

    it('should return true for accounts locked in memory', async () => {
      const username = 'test_user';

      // Set up locked account in memory
      global.loginAttempts.set(username.toLowerCase(), {
        count: 5,
        timestamps: [],
        lockedUntil: Date.now() + 1000 * 60 * 30 // 30 minutes in the future
      });

      const result = await isAccountLocked(username);
      expect(result).toBe(true);
    });
  });
  
  describe('getRemainingLockTime', () => {
    beforeEach(() => {
      // Clear login attempts map before each test
      global.loginAttempts = new Map();
    });

    it('should return 0 for non-locked accounts', async () => {
      // Ensure no existing entries
      global.loginAttempts = new Map();

      const username = 'test_user';
      const result = await getRemainingLockTime(username);
      expect(result).toBe(0);
    });
    
    it('should return remaining lock time for locked accounts', async () => {
      const username = 'test_user';
      const lockDuration = 30 * 60; // 30 minutes in seconds
      
      // Set up locked account in memory
      global.loginAttempts.set(username.toLowerCase(), {
        count: 5,
        timestamps: [],
        lockedUntil: Date.now() + 1000 * lockDuration
      });
      
      const result = await getRemainingLockTime(username);
      
      // Should be approximately the lock duration (within 5 seconds)
      expect(result).toBeGreaterThan(lockDuration - 5);
      expect(result).toBeLessThanOrEqual(lockDuration);
    });
    
    it('should return remaining lock time for accounts locked in database', async () => {
      const username = 'locked_user';
      const result = await getRemainingLockTime(username);
      
      // Should be approximately 30 minutes (within 5 seconds)
      expect(result).toBeGreaterThan(30 * 60 - 5);
      expect(result).toBeLessThanOrEqual(30 * 60);
    });
  });
  
  describe('checkAccountLock middleware', () => {
    beforeEach(() => {
      // Clear login attempts map before each test
      global.loginAttempts = new Map();
    });

    it('should call next for non-locked accounts', async () => {
      // Ensure clean state
      global.loginAttempts = new Map();

      const req = { body: { username: 'test_user' } };
      const res = {};
      const next = jest.fn();

      await checkAccountLock(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
    });
    
    it('should throw error for locked accounts', async () => {
      const username = 'locked_user';
      const req = { body: { username } };
      const res = {};
      const next = jest.fn();
      
      await checkAccountLock(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Account is temporarily locked'),
        statusCode: 403,
        errorCode: 'ACCOUNT_LOCKED'
      }));
    });
    
    it('should throw error if username is missing', async () => {
      const req = { body: {} };
      const res = {};
      const next = jest.fn();
      
      await checkAccountLock(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Username is required',
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR'
      }));
    });
  });
});