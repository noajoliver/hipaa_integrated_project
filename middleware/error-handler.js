/**
 * Error Handler Middleware
 * @module middleware/error-handler
 */
const { AppError } = require('../utils/error-handler');
const { sendError } = require('../utils/api-response');

/**
 * Global error handling middleware that formats error responses
 * @param {Error} err - The error to handle
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandlerMiddleware = (err, req, res, next) => {
  // Default status code and error details
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  let errors = null;
  
  // Handle application errors
  if (err instanceof AppError) {
    return sendError(res, message, errorCode, statusCode, errors);
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid authentication token', 'AUTH_INVALID_TOKEN', 401);
  }
  
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Authentication token has expired', 'AUTH_EXPIRED_TOKEN', 401);
  }
  
  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const validationErrors = {};
    
    err.errors.forEach(error => {
      validationErrors[error.path] = error.message;
    });
    
    return sendError(res, 'Validation error', 'VALIDATION_ERROR', 400, validationErrors);
  }
  
  // Handle Sequelize foreign key errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return sendError(
      res, 
      'This operation violates database constraints', 
      'CONSTRAINT_ERROR', 
      400
    );
  }
  
  // Handle other Sequelize errors
  if (err.name && err.name.startsWith('Sequelize')) {
    return sendError(res, 'Database error', 'DATABASE_ERROR', 500);
  }
  
  // Handle file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File size exceeds limit', 'FILE_TOO_LARGE', 400);
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(res, 'Unexpected file upload field', 'UNEXPECTED_FILE', 400);
  }
  
  // Log unexpected errors in development mode
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', err);
  }
  
  // In production, hide detailed error messages
  if (process.env.NODE_ENV === 'production') {
    message = 'Internal Server Error';
  }
  
  // Send the error response
  return sendError(res, message, errorCode, statusCode, errors);
};

/**
 * Not found (404) middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const notFoundMiddleware = (req, res, next) => {
  const error = new AppError(`Resource not found - ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

module.exports = {
  errorHandlerMiddleware,
  notFoundMiddleware
};