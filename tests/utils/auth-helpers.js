/**
 * Authentication Helpers for Testing
 *
 * Provides utilities for creating authentication tokens
 * and authenticated requests in tests.
 *
 * @module tests/utils/auth-helpers
 */

const { generateToken } = require('../../utils/token-manager');
const jwt = require('jsonwebtoken');

/**
 * Create authentication token for testing
 * @param {Object} user - User object or user data
 * @param {Object} options - Token generation options
 * @returns {string} JWT token
 */
const createAuthToken = (user, options = {}) => {
  // Handle both full user objects and partial user data
  const userData = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role?.name || user.Role?.name || 'User',
    roleId: user.roleId
  };

  // Generate token with default 8h expiration for tests
  const tokenInfo = generateToken(userData, {
    expiresIn: options.expiresIn || '8h'
  });

  return tokenInfo.token;
};

/**
 * Create an expired token for testing
 * @param {Object} user - User object or user data
 * @returns {string} Expired JWT token
 */
const createExpiredToken = (user) => {
  const userData = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role?.name || user.Role?.name || 'User'
  };

  // Create token that expires immediately
  const jwtSecret = process.env.JWT_SECRET || 'test-secret-key';
  const token = jwt.sign(userData, jwtSecret, { expiresIn: '1ms' });

  // Wait a bit to ensure expiration
  return new Promise((resolve) => {
    setTimeout(() => resolve(token), 10);
  });
};

/**
 * Create an invalid token for testing
 * @returns {string} Invalid JWT token
 */
const createInvalidToken = () => {
  return 'invalid.token.string';
};

/**
 * Create request with authentication header
 * @param {Object} request - Supertest request object
 * @param {Object} user - User object
 * @param {Object} options - Token options
 * @returns {Object} Request with authentication header
 */
const authenticatedRequest = (request, user, options = {}) => {
  const token = createAuthToken(user, options);
  return request.set('x-access-token', token);
};

/**
 * Create request with custom token
 * @param {Object} request - Supertest request object
 * @param {string} token - Token string
 * @returns {Object} Request with authentication header
 */
const requestWithToken = (request, token) => {
  return request.set('x-access-token', token);
};

/**
 * Extract token from authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
const extractToken = (authHeader) => {
  if (!authHeader) return null;

  // Support both "Bearer token" and just "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
};

/**
 * Decode token without verification (for testing)
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Create mock user data for token generation
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock user data
 */
const createMockUser = (overrides = {}) => {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: { name: 'User' },
    roleId: 1,
    ...overrides
  };
};

/**
 * Create mock admin user data
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock admin user data
 */
const createMockAdmin = (overrides = {}) => {
  return createMockUser({
    id: 999,
    username: 'admin',
    email: 'admin@example.com',
    role: { name: 'Admin' },
    roleId: 2,
    ...overrides
  });
};

module.exports = {
  createAuthToken,
  createExpiredToken,
  createInvalidToken,
  authenticatedRequest,
  requestWithToken,
  extractToken,
  decodeToken,
  createMockUser,
  createMockAdmin
};
