/**
 * User Service - Handles business logic for user-related operations
 * @module services/user
 */
const { User, Role, Department } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const { AppError } = require('../utils/error-handler');

/**
 * Get all users with role and department information
 * @returns {Promise<Array>} List of users
 */
const getAllUsers = async () => {
  const users = await User.findAll({
    include: [
      {
        model: Role,
        as: 'role',
        attributes: ['id', 'name']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }
    ],
    attributes: { exclude: ['password'] },
    order: [['lastName', 'ASC'], ['firstName', 'ASC']]
  });
  
  return users;
};

/**
 * Get user by ID with role and department information
 * @param {number} id - User ID
 * @returns {Promise<Object>} User object
 * @throws {AppError} If user not found
 */
const getUserById = async (id) => {
  const user = await User.findByPk(id, {
    include: [
      {
        model: Role,
        as: 'role'
      },
      {
        model: Department,
        as: 'department'
      }
    ],
    attributes: { exclude: ['password'] }
  });
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  return user;
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 * @throws {AppError} If validation fails
 */
const createUser = async (userData) => {
  const { 
    username, 
    email, 
    password, 
    firstName, 
    lastName, 
    position, 
    departmentId, 
    roleId,
    accountStatus,
    hireDate
  } = userData;
  
  // Validate required fields
  if (!username || !email || !password || !firstName || !lastName) {
    throw new AppError(
      'Username, email, password, first name, and last name are required', 
      400, 
      'VALIDATION_ERROR'
    );
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
    throw new AppError('Username or email already exists', 400, 'DUPLICATE_USER');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create new user
  const newUser = await User.create({
    username,
    email,
    password: hashedPassword,
    firstName,
    lastName,
    position,
    departmentId,
    roleId,
    accountStatus: accountStatus || 'active',
    hireDate: hireDate ? new Date(hireDate) : new Date()
  });
  
  // Remove password from response
  const userResponse = { ...newUser.toJSON() };
  delete userResponse.password;
  
  return userResponse;
};

/**
 * Update a user
 * @param {number} id - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user
 * @throws {AppError} If user not found or validation fails
 */
const updateUser = async (id, userData) => {
  const { 
    username, 
    email, 
    firstName, 
    lastName, 
    position, 
    departmentId, 
    roleId,
    accountStatus,
    hireDate
  } = userData;
  
  const user = await User.findByPk(id);
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  // Check if username or email already exists (if changed)
  if ((username && username !== user.username) || (email && email !== user.email)) {
    const existingUser = await User.findOne({
      where: {
        id: { [Op.ne]: id },
        [Op.or]: [
          { username: username || '' },
          { email: email || '' }
        ]
      }
    });
    
    if (existingUser) {
      throw new AppError('Username or email already exists', 400, 'DUPLICATE_USER');
    }
  }
  
  // Update user
  await user.update({
    username: username || user.username,
    email: email || user.email,
    firstName: firstName || user.firstName,
    lastName: lastName || user.lastName,
    position: position !== undefined ? position : user.position,
    departmentId: departmentId !== undefined ? departmentId : user.departmentId,
    roleId: roleId !== undefined ? roleId : user.roleId,
    accountStatus: accountStatus || user.accountStatus,
    hireDate: hireDate ? new Date(hireDate) : user.hireDate
  });
  
  // Get updated user with associations
  const updatedUser = await User.findByPk(id, {
    include: [
      {
        model: Role,
        as: 'role'
      },
      {
        model: Department,
        as: 'department'
      }
    ],
    attributes: { exclude: ['password'] }
  });
  
  return updatedUser;
};

/**
 * Deactivate a user (soft delete)
 * @param {number} id - User ID
 * @returns {Promise<boolean>} Success status
 * @throws {AppError} If user not found
 */
const deactivateUser = async (id) => {
  const user = await User.findByPk(id);
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  // Instead of deleting, set account status to inactive
  await user.update({ accountStatus: 'inactive' });
  
  return true;
};

/**
 * Get all roles
 * @returns {Promise<Array>} List of roles
 */
const getAllRoles = async () => {
  const roles = await Role.findAll({
    order: [['name', 'ASC']]
  });
  
  return roles;
};

/**
 * Create a new role
 * @param {Object} roleData - Role data
 * @returns {Promise<Object>} Created role
 * @throws {AppError} If validation fails
 */
const createRole = async (roleData) => {
  const { name, description, permissions } = roleData;
  
  // Validate required fields
  if (!name) {
    throw new AppError('Role name is required', 400, 'VALIDATION_ERROR');
  }
  
  // Check if role already exists
  const existingRole = await Role.findOne({
    where: { name }
  });
  
  if (existingRole) {
    throw new AppError('Role already exists', 400, 'DUPLICATE_ROLE');
  }
  
  // Create new role
  const newRole = await Role.create({
    name,
    description,
    permissions: permissions || {}
  });
  
  return newRole;
};

/**
 * Get all departments
 * @returns {Promise<Array>} List of departments
 */
const getAllDepartments = async () => {
  const departments = await Department.findAll({
    include: [
      {
        model: User,
        as: 'manager',
        attributes: ['id', 'firstName', 'lastName']
      }
    ],
    order: [['name', 'ASC']]
  });
  
  return departments;
};

/**
 * Create a new department
 * @param {Object} departmentData - Department data
 * @returns {Promise<Object>} Created department
 * @throws {AppError} If validation fails
 */
const createDepartment = async (departmentData) => {
  const { name, description, managerId } = departmentData;
  
  // Validate required fields
  if (!name) {
    throw new AppError('Department name is required', 400, 'VALIDATION_ERROR');
  }
  
  // Check if department already exists
  const existingDepartment = await Department.findOne({
    where: { name }
  });
  
  if (existingDepartment) {
    throw new AppError('Department already exists', 400, 'DUPLICATE_DEPARTMENT');
  }
  
  // Check if manager exists if provided
  if (managerId) {
    const manager = await User.findByPk(managerId);
    if (!manager) {
      throw new AppError('Manager not found', 404, 'MANAGER_NOT_FOUND');
    }
  }
  
  // Create new department
  const newDepartment = await Department.create({
    name,
    description,
    managerId
  });
  
  return newDepartment;
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  getAllRoles,
  createRole,
  getAllDepartments,
  createDepartment
};