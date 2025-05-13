/**
 * Rate Limiting Middleware - Protects against brute force attacks
 * @module middleware/rate-limit
 */
const rateLimit = require('express-rate-limit');

/**
 * Standard API rate limiter
 * Limits repeated requests to public APIs
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    errorCode: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Auth rate limiter
 * More strict limits for authentication endpoints to prevent brute force
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
    errorCode: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Strict endpoints rate limiter
 * For particularly sensitive operations (password change, etc.)
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests for sensitive operations, please try again later',
    errorCode: 'STRICT_RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  strictLimiter
};