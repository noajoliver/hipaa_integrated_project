/**
 * Mock utilities for testing
 * @module tests/utils/mock-utils
 */

/**
 * Create a mock user object
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock user object
 */
const mockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  position: 'Employee',
  departmentId: 1,
  roleId: 2,
  accountStatus: 'active',
  failedLoginAttempts: 0,
  requirePasswordChange: false,
  ...overrides
});

/**
 * Create a mock role object
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock role object
 */
const mockRole = (overrides = {}) => ({
  id: 1,
  name: 'Admin',
  description: 'Administrator role',
  permissions: { isAdmin: true },
  ...overrides
});

/**
 * Create a mock department object
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock department object
 */
const mockDepartment = (overrides = {}) => ({
  id: 1,
  name: 'IT',
  description: 'Information Technology',
  managerId: null,
  ...overrides
});

/**
 * Create a mock token object
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock token object
 */
const mockTokenInfo = (overrides = {}) => ({
  token: 'mock.jwt.token',
  expiresIn: '8h',
  jti: '123456',
  expirationTime: Math.floor(Date.now() / 1000) + 28800, // 8 hours from now
  ...overrides
});

/**
 * Create a mock express request object
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock request object
 */
const mockRequest = (overrides = {}) => {
  const req = {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: mockUser(),
    ...overrides
  };
  return req;
};

/**
 * Create a mock express response object
 * @returns {Object} Mock response object with jest spy functions
 */
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create a mock next function
 * @returns {Function} Mock next function
 */
const mockNext = jest.fn();

module.exports = {
  mockUser,
  mockRole,
  mockDepartment,
  mockTokenInfo,
  mockRequest,
  mockResponse,
  mockNext
};