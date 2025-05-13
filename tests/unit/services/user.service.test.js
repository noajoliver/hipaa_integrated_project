/**
 * User Service Unit Tests
 * @module tests/unit/services/user-service
 */
const userService = require('../../../services/user.service');
const { User, Role, Department } = require('../../../models');
const { AppError } = require('../../../utils/error-handler');
const bcrypt = require('bcrypt');

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
    accountStatus: 'active'
  });
  
  // Create Role model mock
  const RoleMock = dbMock.define('Role', {
    id: 2,
    name: 'User',
    description: 'Regular user role',
    permissions: {}
  });
  
  // Create Department model mock
  const DepartmentMock = dbMock.define('Department', {
    id: 1,
    name: 'IT',
    description: 'Information Technology',
    managerId: null
  });
  
  // Add relationships between models
  UserMock.belongsTo(RoleMock, { as: 'role', foreignKey: 'roleId' });
  UserMock.belongsTo(DepartmentMock, { as: 'department', foreignKey: 'departmentId' });
  
  return {
    User: UserMock,
    Role: RoleMock,
    Department: DepartmentMock,
    sequelize: dbMock
  };
});

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getAllUsers', () => {
    it('should return all users with role and department information', async () => {
      // Mock User.findAll to return mock users
      User.findAll = jest.fn().mockResolvedValue([
        {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: { id: 2, name: 'User' },
          department: { id: 1, name: 'IT' }
        }
      ]);
      
      const result = await userService.getAllUsers();
      
      expect(User.findAll).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('username', 'testuser');
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('department');
    });
  });
  
  describe('getUserById', () => {
    it('should return a user when given a valid ID', async () => {
      // Mock User.findByPk to return a mock user
      User.findByPk = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: { id: 2, name: 'User' },
        department: { id: 1, name: 'IT' }
      });
      
      const result = await userService.getUserById(1);
      
      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('username', 'testuser');
    });
    
    it('should throw an error when user not found', async () => {
      // Mock User.findByPk to return null
      User.findByPk = jest.fn().mockResolvedValue(null);
      
      await expect(userService.getUserById(999)).rejects.toThrow(AppError);
      await expect(userService.getUserById(999)).rejects.toThrow('User not found');
    });
  });
  
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
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
      
      const result = await userService.createUser(userData);
      
      expect(User.findOne).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(User.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 2);
      expect(result).toHaveProperty('username', 'newuser');
      expect(result).not.toHaveProperty('password'); // Password should be removed
    });
    
    it('should throw an error when required fields are missing', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com'
        // Missing required fields
      };
      
      await expect(userService.createUser(userData)).rejects.toThrow(AppError);
      await expect(userService.createUser(userData)).rejects.toThrow('Username, email, password, first name, and last name are required');
    });
    
    it('should throw an error when username or email already exists', async () => {
      // Mock User.findOne to return an existing user
      User.findOne = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      });
      
      const userData = {
        username: 'testuser', // Existing username
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User'
      };
      
      await expect(userService.createUser(userData)).rejects.toThrow(AppError);
      await expect(userService.createUser(userData)).rejects.toThrow('Username or email already exists');
    });
  });
  
  describe('updateUser', () => {
    it('should update a user with valid data', async () => {
      // Mock User.findByPk to return a mock user
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        position: 'Employee',
        departmentId: 1,
        roleId: 2,
        accountStatus: 'active',
        update: jest.fn().mockResolvedValue(true)
      };
      
      User.findByPk = jest.fn()
        .mockResolvedValueOnce(mockUser) // First call returns the user for the update
        .mockResolvedValueOnce({ // Second call returns the updated user
          id: 1,
          username: 'testuser',
          email: 'updated@example.com',
          firstName: 'Updated',
          lastName: 'User',
          position: 'Senior Employee',
          departmentId: 1,
          roleId: 2,
          accountStatus: 'active',
          role: { id: 2, name: 'User' },
          department: { id: 1, name: 'IT' }
        });
      
      // Mock User.findOne to return null (no duplicate)
      User.findOne = jest.fn().mockResolvedValue(null);
      
      const userData = {
        email: 'updated@example.com',
        firstName: 'Updated',
        position: 'Senior Employee'
      };
      
      const result = await userService.updateUser(1, userData);
      
      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(mockUser.update).toHaveBeenCalled();
      expect(result).toHaveProperty('email', 'updated@example.com');
      expect(result).toHaveProperty('firstName', 'Updated');
      expect(result).toHaveProperty('position', 'Senior Employee');
    });
    
    it('should throw an error when user not found', async () => {
      // Mock User.findByPk to return null
      User.findByPk = jest.fn().mockResolvedValue(null);
      
      const userData = {
        email: 'updated@example.com'
      };
      
      await expect(userService.updateUser(999, userData)).rejects.toThrow(AppError);
      await expect(userService.updateUser(999, userData)).rejects.toThrow('User not found');
    });
    
    it('should throw an error when username or email already exists', async () => {
      // Mock User.findByPk to return a mock user
      User.findByPk = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        update: jest.fn()
      });
      
      // Mock User.findOne to return an existing user with different ID
      User.findOne = jest.fn().mockResolvedValue({
        id: 2,
        username: 'otheruser',
        email: 'other@example.com'
      });
      
      const userData = {
        email: 'other@example.com' // Email already exists for another user
      };
      
      await expect(userService.updateUser(1, userData)).rejects.toThrow(AppError);
      await expect(userService.updateUser(1, userData)).rejects.toThrow('Username or email already exists');
    });
  });
  
  describe('deactivateUser', () => {
    it('should deactivate a user', async () => {
      // Mock User.findByPk to return a mock user
      const mockUser = {
        id: 1,
        username: 'testuser',
        accountStatus: 'active',
        update: jest.fn().mockResolvedValue(true)
      };
      
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      
      const result = await userService.deactivateUser(1);
      
      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(mockUser.update).toHaveBeenCalledWith({ accountStatus: 'inactive' });
      expect(result).toBe(true);
    });
    
    it('should throw an error when user not found', async () => {
      // Mock User.findByPk to return null
      User.findByPk = jest.fn().mockResolvedValue(null);
      
      await expect(userService.deactivateUser(999)).rejects.toThrow(AppError);
      await expect(userService.deactivateUser(999)).rejects.toThrow('User not found');
    });
  });
  
  describe('getAllRoles', () => {
    it('should return all roles', async () => {
      // Mock Role.findAll to return mock roles
      Role.findAll = jest.fn().mockResolvedValue([
        { id: 1, name: 'Admin', description: 'Administrator role' },
        { id: 2, name: 'User', description: 'Regular user role' }
      ]);
      
      const result = await userService.getAllRoles();
      
      expect(Role.findAll).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('name', 'Admin');
      expect(result[1]).toHaveProperty('name', 'User');
    });
  });
  
  describe('getAllDepartments', () => {
    it('should return all departments', async () => {
      // Mock Department.findAll to return mock departments
      Department.findAll = jest.fn().mockResolvedValue([
        { id: 1, name: 'IT', description: 'Information Technology' },
        { id: 2, name: 'HR', description: 'Human Resources' }
      ]);
      
      const result = await userService.getAllDepartments();
      
      expect(Department.findAll).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('name', 'IT');
      expect(result[1]).toHaveProperty('name', 'HR');
    });
  });
});