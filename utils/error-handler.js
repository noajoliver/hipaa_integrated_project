/**
 * Error Handler - Standardized error handling utilities
 * @module utils/error-handler
 */

/**
 * Custom application error class
 * @class AppError
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Application-specific error code
   */
  constructor(message, statusCode, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // Flag for operational vs programming errors
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard handler for API errors
 * @param {Error} err - The error to handle
 * @param {Object} res - Express response object
 * @returns {Object} - Formatted error response
 */
const handleError = (err, res) => {
  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      errorCode: err.errorCode,
      message: err.message
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid authentication token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      errorCode: 'EXPIRED_TOKEN',
      message: 'Authentication token has expired'
    });
  }
  
  // Handle Sequelize errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation error',
      errors
    });
  }
  
  // Log unexpected errors but don't expose details to client in production
  console.error('Unhandled error:', err);
  
  // In production, hide details
  const isDevelopment = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    success: false,
    errorCode: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    ...(isDevelopment && { error: err.message, stack: err.stack })
  });
};

/**
 * Handle errors in async express route handlers
 * @param {Function} fn - Async route handler
 * @returns {Function} - Error-handling wrapper function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => next(err));
  };
};

/**
 * Middleware for handling 404 Not Found errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Resource not found - ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(err);
};

/**
 * Global error handling middleware for Express
 * @param {Error} err - The error to handle
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorMiddleware = (err, req, res, next) => {
  // Set default status code if not set
  err.statusCode = err.statusCode || 500;
  
  // Handle the error
  handleError(err, res);
};

module.exports = {
  AppError,
  handleError,
  asyncHandler,
  notFoundHandler,
  errorMiddleware
};