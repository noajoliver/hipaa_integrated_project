/**
 * Input Validation Middleware
 *
 * Provides middleware functions for validating request parameters,
 * body data, and query parameters.
 *
 * @module middleware/validation
 */

const { AppError } = require('./error-handler');

/**
 * Validate that a route parameter is a valid positive integer
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Function} Express middleware function
 */
const validateIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];

    // Check if the value exists
    if (!value) {
      return next(new AppError(`Missing required parameter: ${paramName}`, 400, 'MISSING_PARAMETER'));
    }

    // Check if it's a valid integer
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed.toString() !== value || parsed <= 0) {
      return next(new AppError(`Invalid ${paramName}: must be a positive integer`, 400, 'INVALID_ID'));
    }

    // Store the parsed value back to params
    req.params[paramName] = parsed;
    next();
  };
};

/**
 * Validate that required fields are present in request body
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Function} Express middleware function
 */
const validateRequiredFields = (requiredFields = []) => {
  return (req, res, next) => {
    const missingFields = [];

    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return next(new AppError(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        'MISSING_REQUIRED_FIELDS',
        { missingFields }
      ));
    }

    next();
  };
};

/**
 * Validate that a field is a valid email
 * @param {string} fieldName - Name of the email field
 * @returns {Function} Express middleware function
 */
const validateEmail = (fieldName = 'email') => {
  return (req, res, next) => {
    const email = req.body[fieldName];

    if (!email) {
      return next();
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError(`Invalid ${fieldName} format`, 400, 'INVALID_EMAIL'));
    }

    next();
  };
};

/**
 * Validate that a numeric field is within a range
 * @param {string} fieldName - Name of the field to validate
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {Function} Express middleware function
 */
const validateRange = (fieldName, min, max) => {
  return (req, res, next) => {
    const value = req.body[fieldName];

    if (value === undefined || value === null) {
      return next();
    }

    const parsed = Number(value);
    if (isNaN(parsed)) {
      return next(new AppError(`${fieldName} must be a number`, 400, 'INVALID_NUMBER'));
    }

    if (parsed < min || parsed > max) {
      return next(new AppError(
        `${fieldName} must be between ${min} and ${max}`,
        400,
        'VALUE_OUT_OF_RANGE'
      ));
    }

    next();
  };
};

/**
 * Validate that a field is one of the allowed values
 * @param {string} fieldName - Name of the field to validate
 * @param {Array} allowedValues - Array of allowed values
 * @returns {Function} Express middleware function
 */
const validateEnum = (fieldName, allowedValues) => {
  return (req, res, next) => {
    const value = req.body[fieldName];

    if (value === undefined || value === null) {
      return next();
    }

    if (!allowedValues.includes(value)) {
      return next(new AppError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        400,
        'INVALID_ENUM_VALUE'
      ));
    }

    next();
  };
};

module.exports = {
  validateIdParam,
  validateRequiredFields,
  validateEmail,
  validateRange,
  validateEnum
};
