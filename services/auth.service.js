/**
 * Authentication Service - Handles authentication related business logic
 * @module services/auth
 */
const { User, Role } = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { generateToken, blacklistToken } = require('../utils/token-manager');
const { AppError } = require('../utils/error-handler');
const { validatePassword } = require('../utils/password-validator');

/**
 * Authenticate a user with username and password
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} User and token information
 * @throws {AppError} If authentication fails
 */
const authenticate = async (username, password) => {
  // Validate inputs
  if (!username || !password) {
    throw new AppError('Username and password are required', 400, 'VALIDATION_ERROR');
  }

  // Find user by username
  const user = await User.findOne({
    where: { username },
    include: [{
      model: Role,
      as: 'role',
      attributes: ['id', 'name', 'permissions']
    }]
  });

  // Check if user exists
  if (!user) {
    throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is active
  if (user.accountStatus !== 'active') {
    let message = 'Account is not active';
    let errorCode = 'ACCOUNT_INACTIVE';

    if (user.accountStatus === 'locked') {
      message = 'Account is locked. Please contact an administrator.';
      errorCode = 'ACCOUNT_LOCKED';
    } else if (user.accountStatus === 'inactive') {
      message = 'Account has been deactivated. Please contact an administrator.';
      errorCode = 'ACCOUNT_DEACTIVATED';
    } else if (user.accountStatus === 'pending') {
      message = 'Account is pending approval. Please wait for activation.';
      errorCode = 'ACCOUNT_PENDING';
    }

    throw new AppError(message, 403, errorCode);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    // Track failed login attempts
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    
    // Lock account after 5 failed attempts
    if (user.failedLoginAttempts >= 5) {
      user.accountStatus = 'locked';
      await user.save();
      throw new AppError('Account locked due to too many failed login attempts', 403, 'ACCOUNT_LOCKED');
    }
    
    await user.save();
    throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
  }

  // Reset failed login attempts on successful login
  user.failedLoginAttempts = 0;
  await user.save();

  // Generate token
  const userData = {
    id: user.id,
    username: user.username,
    email: user.email,
    roleId: user.roleId
  };

  const tokenInfo = generateToken(userData);

  // Format user object for response (exclude password)
  const userResponse = {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    position: user.position,
    departmentId: user.departmentId,
    roleId: user.roleId,
    role: user.role ? {
      id: user.role.id,
      name: user.role.name
    } : null,
    requirePasswordChange: user.requirePasswordChange
  };

  return {
    user: userResponse,
    token: tokenInfo.token,
    expiresAt: tokenInfo.expirationTime
  };
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user
 * @throws {AppError} If validation fails
 */
const register = async (userData) => {
  const { 
    username, 
    email, 
    password, 
    firstName, 
    lastName, 
    position, 
    departmentId, 
    roleId 
  } = userData;

  // Validate required fields
  if (!username || !email || !password || !firstName || !lastName) {
    throw new AppError(
      'Username, email, password, first name, and last name are required', 
      400, 
      'VALIDATION_ERROR'
    );
  }

  // Validate password strength
  const passwordValidation = validatePassword(password, {
    firstName,
    lastName,
    username,
    email
  });

  if (!passwordValidation.isValid) {
    throw new AppError(
      passwordValidation.message, 
      400, 
      'PASSWORD_VALIDATION_ERROR'
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

  // Create new user with pending status if roleId isn't provided
  const newUser = await User.create({
    username,
    email,
    password: hashedPassword,
    firstName,
    lastName,
    position,
    departmentId,
    roleId,
    accountStatus: roleId ? 'active' : 'pending' // Set to pending if no role assigned
  });

  // Remove password from response
  const userResponse = { ...newUser.toJSON() };
  delete userResponse.password;

  return userResponse;
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<boolean>} Success status
 * @throws {AppError} If user not found
 */
const requestPasswordReset = async (email) => {
  if (!email) {
    throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
  }

  // Find user by email
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour

  // Store reset token in user record
  await user.update({
    resetToken,
    resetTokenExpiry
  });

  // In a real application, send email with reset token
  // For this example, we'll just return success
  return true;
};

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success status
 * @throws {AppError} If token invalid or expired
 */
const resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw new AppError('Token and new password are required', 400, 'VALIDATION_ERROR');
  }

  // Find user by reset token
  const user = await User.findOne({
    where: {
      resetToken: token,
      resetTokenExpiry: { [Op.gt]: Date.now() }
    }
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
  }

  // Validate password strength
  const passwordValidation = validatePassword(newPassword, {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email
  });

  if (!passwordValidation.isValid) {
    throw new AppError(
      passwordValidation.message, 
      400, 
      'PASSWORD_VALIDATION_ERROR'
    );
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user with new password and clear reset token
  await user.update({
    password: hashedPassword,
    resetToken: null,
    resetTokenExpiry: null,
    requirePasswordChange: false
  });

  return true;
};

/**
 * Change user password
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success status
 * @throws {AppError} If current password is invalid
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  if (!userId || !currentPassword || !newPassword) {
    throw new AppError('User ID, current password, and new password are required', 400, 'VALIDATION_ERROR');
  }

  // Find user
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
  }

  // Validate password strength
  const passwordValidation = validatePassword(newPassword, {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email
  });

  if (!passwordValidation.isValid) {
    throw new AppError(
      passwordValidation.message, 
      400, 
      'PASSWORD_VALIDATION_ERROR'
    );
  }

  // Check if new password is same as current
  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new AppError('New password must be different from current password', 400, 'SAME_PASSWORD');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  await user.update({
    password: hashedPassword,
    requirePasswordChange: false
  });

  return true;
};

/**
 * Logout user by blacklisting token
 * @param {string} token - JWT token
 * @param {number} expirationTime - Token expiration time
 * @returns {Promise<boolean>} Success status
 */
const logout = async (token, expirationTime) => {
  if (!token) {
    throw new AppError('Token is required', 400, 'VALIDATION_ERROR');
  }

  try {
    // Decode token to get jti
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.jti) {
      throw new AppError('Invalid token format', 400, 'INVALID_TOKEN');
    }

    // Blacklist token
    await blacklistToken(decoded.jti, expirationTime || decoded.exp);
    return true;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to logout', 500, 'LOGOUT_ERROR');
  }
};

module.exports = {
  authenticate,
  register,
  requestPasswordReset,
  resetPassword,
  changePassword,
  logout
};