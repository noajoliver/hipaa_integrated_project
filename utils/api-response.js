/**
 * API Response Formatter - Standardized API response formats
 * @module utils/api-response
 */

/**
 * Create a success response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Formatted success response object
 */
const success = (data = null, message = 'Operation successful', statusCode = 200) => {
  return {
    success: true,
    message,
    statusCode,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create an error response object
 * @param {string} message - Error message
 * @param {string} errorCode - Application-specific error code
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {Object} errors - Detailed error information
 * @returns {Object} Formatted error response object
 */
const error = (message = 'Operation failed', errorCode = 'ERROR', statusCode = 400, errors = null) => {
  return {
    success: false,
    message,
    statusCode,
    errorCode,
    errors,
    timestamp: new Date().toISOString()
  };
};

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data = null, message = 'Operation successful', statusCode = 200) => {
  const response = success(data, message, statusCode);
  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} errorCode - Application-specific error code
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {Object} errors - Detailed error information
 */
const sendError = (res, message = 'Operation failed', errorCode = 'ERROR', statusCode = 400, errors = null) => {
  const response = error(message, errorCode, statusCode, errors);
  return res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Paginated items
 * @param {number} totalItems - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendPaginated = (res, data, totalItems, page, limit, message = 'Data retrieved successfully', statusCode = 200) => {
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = page;
  const hasNext = currentPage < totalPages;
  const hasPrevious = currentPage > 1;
  
  const response = {
    success: true,
    message,
    statusCode,
    data,
    pagination: {
      totalItems,
      totalPages,
      currentPage,
      itemsPerPage: limit,
      hasNext,
      hasPrevious
    },
    timestamp: new Date().toISOString()
  };
  
  return res.status(statusCode).json(response);
};

module.exports = {
  success,
  error,
  sendSuccess,
  sendError,
  sendPaginated
};