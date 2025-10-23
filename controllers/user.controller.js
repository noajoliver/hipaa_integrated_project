/**
 * User Controller - Handles HTTP requests for user-related operations
 * @module controllers/user
 */
const userService = require('../services/user.service');
const { asyncHandler } = require('../utils/error-handler');
const { Role, Department, User } = require('../models');

/**
 * Get all users
 * @async
 * @function getAllUsers
 *
 * @route GET /api/users
 * @access Private/Admin
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with array of users
 * @throws {AppError} If retrieval fails
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();

  return res.status(200).json({
    success: true,
    data: users
  });
});

/**
 * Get user by ID
 * @async
 * @function getUserById
 *
 * @route GET /api/users/:id
 * @access Private/Admin
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - User ID to retrieve
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with user data
 * @throws {AppError} If user not found or retrieval fails
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.getUserById(id);
  
  return res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * Create a new user
 * @async
 * @function createUser
 *
 * @route POST /api/users
 * @access Private/Admin
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing user data
 * @param {string} req.body.username - Username for the new user
 * @param {string} req.body.email - Email address of the new user
 * @param {string} req.body.password - Password for the new user
 * @param {string} [req.body.firstName] - First name of the new user
 * @param {string} [req.body.lastName] - Last name of the new user
 * @param {number} req.body.roleId - Role ID for the new user
 * @param {number} [req.body.departmentId] - Department ID for the new user
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with newly created user data
 * @throws {AppError} If creation fails or validation errors occur
 */
exports.createUser = asyncHandler(async (req, res) => {
  const userData = req.body;
  const newUser = await userService.createUser(userData);
  
  return res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: newUser
  });
});

/**
 * Update a user
 * @async
 * @function updateUser
 *
 * @route PUT /api/users/:id
 * @access Private/Admin
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - User ID to update
 * @param {Object} req.body - Request body containing user data to update
 * @param {string} [req.body.email] - Updated email address
 * @param {string} [req.body.firstName] - Updated first name
 * @param {string} [req.body.lastName] - Updated last name
 * @param {number} [req.body.roleId] - Updated role ID
 * @param {number} [req.body.departmentId] - Updated department ID
 * @param {string} [req.body.accountStatus] - Updated account status
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with updated user data
 * @throws {AppError} If user not found or update fails
 */
exports.updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userData = req.body;
  
  const updatedUser = await userService.updateUser(id, userData);
  
  return res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser
  });
});

/**
 * Delete a user (soft delete)
 * @async
 * @function deleteUser
 *
 * @route DELETE /api/users/:id
 * @access Private/Admin
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - User ID to delete/deactivate
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with success message
 * @throws {AppError} If user not found or deletion fails
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await userService.deactivateUser(id);
  
  return res.status(200).json({
    success: true,
    message: 'User deactivated successfully'
  });
});

/**
 * Get all roles
 * @async
 * @function getAllRoles
 *
 * @route GET /api/users/roles
 * @access Private/Admin
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with array of roles
 * @throws {AppError} If retrieval fails
 */
exports.getAllRoles = asyncHandler(async (req, res) => {
  const roles = await Role.findAll({
    order: [['name', 'ASC']]
  });

  return res.status(200).json({
    success: true,
    data: roles
  });
});

/**
 * Create a new role
 * @async
 * @function createRole
 *
 * @route POST /api/users/roles
 * @access Private/Admin
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing role data
 * @param {string} req.body.name - Name of the new role
 * @param {string} [req.body.description] - Description of the new role
 * @param {Array<string>} [req.body.permissions] - Array of permission names for the role
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with newly created role data
 * @throws {AppError} If creation fails or validation errors occur
 */
exports.createRole = asyncHandler(async (req, res) => {
  const roleData = req.body;
  const newRole = await userService.createRole(roleData);
  
  return res.status(201).json({
    success: true,
    message: 'Role created successfully',
    data: newRole
  });
});

/**
 * Get all departments
 * @async
 * @function getAllDepartments
 *
 * @route GET /api/users/departments
 * @access Private/Admin
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with array of departments
 * @throws {AppError} If retrieval fails
 */
exports.getAllDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.findAll({
    include: [
      {
        model: User,
        as: 'manager',
        attributes: ['id', 'firstName', 'lastName'],
        required: false
      }
    ],
    order: [['name', 'ASC']]
  });

  return res.status(200).json({
    success: true,
    data: departments
  });
});

/**
 * Create a new department
 * @async
 * @function createDepartment
 *
 * @route POST /api/users/departments
 * @access Private/Admin
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing department data
 * @param {string} req.body.name - Name of the new department
 * @param {string} [req.body.description] - Description of the new department
 * @param {number} [req.body.parentId] - Parent department ID if this is a subdepartment
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with newly created department data
 * @throws {AppError} If creation fails or validation errors occur
 */
exports.createDepartment = asyncHandler(async (req, res) => {
  const departmentData = req.body;
  const newDepartment = await userService.createDepartment(departmentData);
  
  return res.status(201).json({
    success: true,
    message: 'Department created successfully',
    data: newDepartment
  });
});