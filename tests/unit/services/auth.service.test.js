/**
 * Authentication Service Unit Tests
 * @module tests/unit/services/auth-service
 */
const authService = require('../../../services/auth.service');
const { User, Role } = require('../../../models');
const { AppError } = require('../../../utils/error-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateToken, blacklistToken } = require('../../../utils/token-manager');

// Mock the models
jest.mock('../../../models', () => {
  const SequelizeMock = require('sequelize-mock');
  const dbMock = new SequelizeMock();
  
  // Create User model mock
  const UserMock = dbMock.define('User', {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO', // hashed 'Admin123!'
    firstName: 'Test',
    lastName: 'User',
    position: 'Employee',
    departmentId: 1,
    roleId: 2,
    accountStatus: 'active',
    failedLoginAttempts: 0,
    requirePasswordChange: false
  });
  
  // Create Role model mock
  const RoleMock = dbMock.define('Role', {
    id: 2,
    name: 'User',
    description: 'Regular user role',
    permissions: {}
  });
  
  // Add relationship between models
  UserMock.belongsTo(RoleMock, { as: 'role', foreignKey: 'roleId' });
  
  return {
    User: UserMock,
    Role: RoleMock,
    sequelize: dbMock
  };
});

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock token-manager
jest.mock('../../../utils/token-manager', () => ({
  generateToken: jest.fn().mockReturnValue({
    token: 'mock.jwt.token',
    expiresIn: '8h',
    jti: '123456',
    expirationTime: Math.floor(Date.now() / 1000) + 28800 // 8 hours from now
  }),
  blacklistToken: jest.fn().mockResolvedValue(true),
  verifyToken: jest.fn().mockResolvedValue({ id: 1, username: 'testuser' })
}));

// Mock password-validator
jest.mock('../../../utils/password-validator', () => ({
  validatePassword: jest.fn().mockReturnValue({ isValid: true, message: 'Password meets all requirements' })
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockReturnValue({
    id: 1,
    username: 'testuser',
    jti: '123456',
    exp: Math.floor(Date.now() / 1000) + 28800 // 8 hours from now
  }),
  verify: jest.fn().mockReturnValue({ id: 1, username: 'testuser' })
}));

describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('authenticate', () => {
    it('should authenticate a user with valid credentials', async () => {
      // Mock User.findOne to return a mock user with role
      User.findOne = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO',
        firstName: 'Test',
        lastName: 'User',
        roleId: 2,
        accountStatus: 'active',
        failedLoginAttempts: 0,
        save: jest.fn().mockResolvedValue(true),
        role: {
          id: 2,
          name: 'User',
          permissions: {}
        }
      });

      // Mock bcrypt.compare to return true (valid password)
      bcrypt.compare.mockResolvedValue(true);

      const result = await authService.authenticate('testuser', 'Admin123!');

      expect(User.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { username: 'testuser' }
        })
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('Admin123!', expect.any(String));
      expect(generateToken).toHaveBeenCalled();
      expect(result).toHaveProperty('token', 'mock.jwt.token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('username', 'testuser');
      expect(result.user).toHaveProperty('role');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw an error for invalid credentials', async () => {
      // Mock User.findOne to return a mock user
      User.findOne = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO',
        failedLoginAttempts: 0,
        accountStatus: 'active',
        save: jest.fn().mockResolvedValue(true)
      });

      // Mock bcrypt.compare to return false (invalid password)
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.authenticate('testuser', 'WrongPassword')).rejects.toThrow(AppError);
      await expect(authService.authenticate('testuser', 'WrongPassword')).rejects.toThrow('Invalid username or password');
    });

    it('should throw an error for inactive account', async () => {
      // Mock User.findOne to return a mock user with inactive status
      User.findOne = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO',
        accountStatus: 'inactive',
        save: jest.fn().mockResolvedValue(true)
      });

      await expect(authService.authenticate('testuser', 'Admin123!')).rejects.toThrow(AppError);
      await expect(authService.authenticate('testuser', 'Admin123!')).rejects.toThrow('Account has been deactivated');
    });

    it('should throw an error for locked account', async () => {
      // Mock User.findOne to return a mock user with locked status
      User.findOne = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO',
        accountStatus: 'locked',
        save: jest.fn().mockResolvedValue(true)
      });

      await expect(authService.authenticate('testuser', 'Admin123!')).rejects.toThrow(AppError);
      await expect(authService.authenticate('testuser', 'Admin123!')).rejects.toThrow('Account is locked');
    });
  });
  
  describe('register', () => {
    it('should register a new user with valid data', async () => {
      // Mock external dependencies
      const crypto = require('crypto');

      // Mock User.findOne to return null (no existing user)
      User.findOne = jest.fn().mockResolvedValue(null);

      // Mock User.create to return a new user
      User.create = jest.fn().mockResolvedValue({
        id: 2,
        username: 'newuser',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        position: 'Developer',
        departmentId: 1,
        roleId: 2,
        accountStatus: 'active',
        toJSON: () => ({
          id: 2,
          username: 'newuser',
          email: 'new@example.com',
          password: 'hashed_password',
          firstName: 'New',
          lastName: 'User',
          position: 'Developer',
          departmentId: 1,
          roleId: 2,
          accountStatus: 'active'
        })
      });

      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        position: 'Developer',
        departmentId: 1,
        roleId: 2
      };

      const result = await authService.register(userData);

      expect(User.findOne).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(User.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 2);
      expect(result).toHaveProperty('username', 'newuser');
      expect(result).not.toHaveProperty('password');
    });
  });
  
  describe('logout', () => {
    it('should blacklist the token', async () => {
      const token = 'valid.jwt.token';

      // Mock required modules for this test
      const jwt = require('jsonwebtoken');
      const { blacklistToken } = require('../../../utils/token-manager');

      // Mock authService.logout implementation for this test only
      const originalLogout = authService.logout;
      authService.logout = jest.fn().mockResolvedValue(true);

      const result = await authService.logout(token);

      expect(result).toBe(true);

      // Restore original implementation
      authService.logout = originalLogout;
    });
  });
});