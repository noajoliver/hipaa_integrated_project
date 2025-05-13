/**
 * Tests for the rate limiting middleware
 */
const { apiLimiter, authLimiter, strictLimiter } = require('../../middleware/rate-limit');

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation(config => {
    // Return the config for verification
    return config;
  });
});

describe('Rate Limiting Middleware', () => {
  describe('apiLimiter', () => {
    it('should have correct configuration', () => {
      expect(apiLimiter).toBeDefined();
      expect(apiLimiter.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(apiLimiter.limit).toBe(100);
      expect(apiLimiter.standardHeaders).toBe(true);
      expect(apiLimiter.legacyHeaders).toBe(false);
      expect(apiLimiter.message).toEqual({
        success: false,
        message: 'Too many requests, please try again later',
        errorCode: 'RATE_LIMIT_EXCEEDED'
      });
    });
  });
  
  describe('authLimiter', () => {
    it('should have stricter limits for authentication', () => {
      expect(authLimiter).toBeDefined();
      expect(authLimiter.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(authLimiter.limit).toBe(10); // Stricter than API limiter
      expect(authLimiter.standardHeaders).toBe(true);
      expect(authLimiter.legacyHeaders).toBe(false);
      expect(authLimiter.message).toEqual({
        success: false,
        message: 'Too many login attempts, please try again later',
        errorCode: 'AUTH_RATE_LIMIT_EXCEEDED'
      });
    });
  });
  
  describe('strictLimiter', () => {
    it('should have very strict limits for sensitive operations', () => {
      expect(strictLimiter).toBeDefined();
      expect(strictLimiter.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(strictLimiter.limit).toBe(5); // Very strict
      expect(strictLimiter.standardHeaders).toBe(true);
      expect(strictLimiter.legacyHeaders).toBe(false);
      expect(strictLimiter.message).toEqual({
        success: false,
        message: 'Too many requests for sensitive operations, please try again later',
        errorCode: 'STRICT_RATE_LIMIT_EXCEEDED'
      });
    });
  });
});