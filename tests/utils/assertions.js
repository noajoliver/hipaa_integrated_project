/**
 * Custom Assertion Helpers for Testing
 *
 * Provides reusable assertion functions for common
 * API response patterns and validation scenarios.
 *
 * @module tests/utils/assertions
 */

/**
 * Assert that a response indicates a validation error
 * @param {Object} response - HTTP response object
 * @param {string} field - Optional field name that should be mentioned in error
 */
const assertValidationError = (response, field = null) => {
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBeDefined();

  if (field) {
    expect(response.body.message.toLowerCase()).toContain(field.toLowerCase());
  }
};

/**
 * Assert that a response indicates unauthorized access
 * @param {Object} response - HTTP response object
 * @param {string} message - Optional expected error message
 */
const assertUnauthorized = (response, message = null) => {
  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);

  if (message) {
    expect(response.body.message).toContain(message);
  }
};

/**
 * Assert that a response indicates forbidden access
 * @param {Object} response - HTTP response object
 * @param {string} message - Optional expected error message
 */
const assertForbidden = (response, message = null) => {
  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);

  if (message) {
    expect(response.body.message).toContain(message);
  }
};

/**
 * Assert that a response indicates resource not found
 * @param {Object} response - HTTP response object
 * @param {string} resource - Optional resource type mentioned in error
 */
const assertNotFound = (response, resource = null) => {
  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);

  if (resource) {
    expect(response.body.message.toLowerCase()).toContain(resource.toLowerCase());
  }
};

/**
 * Assert that a response indicates a successful operation
 * @param {Object} response - HTTP response object
 * @param {Object} expectedData - Optional expected data properties
 * @param {number} statusCode - Expected status code (default: 200)
 */
const assertSuccess = (response, expectedData = {}, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();

  // Check expected data properties
  Object.keys(expectedData).forEach(key => {
    expect(response.body.data).toHaveProperty(key, expectedData[key]);
  });
};

/**
 * Assert that a response indicates a successful creation
 * @param {Object} response - HTTP response object
 * @param {Object} expectedData - Optional expected data properties
 */
const assertCreated = (response, expectedData = {}) => {
  assertSuccess(response, expectedData, 201);
  expect(response.body.data.id).toBeDefined();
};

/**
 * Assert that a response contains an error
 * @param {Object} response - HTTP response object
 * @param {number} statusCode - Expected status code
 * @param {string} message - Optional expected error message substring
 */
const assertError = (response, statusCode, message = null) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBeDefined();

  if (message) {
    expect(response.body.message).toContain(message);
  }
};

/**
 * Assert that a response contains paginated data
 * @param {Object} response - HTTP response object
 * @param {Object} expectations - Expected pagination properties
 */
const assertPagination = (response, expectations = {}) => {
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
  expect(response.body.pagination).toBeDefined();

  const { pagination } = response.body;

  // Check pagination structure
  expect(pagination).toHaveProperty('page');
  expect(pagination).toHaveProperty('limit');
  expect(pagination).toHaveProperty('total');
  expect(pagination).toHaveProperty('totalPages');

  // Check optional expectations
  if (expectations.page) {
    expect(pagination.page).toBe(expectations.page);
  }
  if (expectations.limit) {
    expect(pagination.limit).toBe(expectations.limit);
  }
  if (expectations.total !== undefined) {
    expect(pagination.total).toBe(expectations.total);
  }
  if (expectations.minTotal !== undefined) {
    expect(pagination.total).toBeGreaterThanOrEqual(expectations.minTotal);
  }
};

/**
 * Assert that response data is an array with expected length
 * @param {Object} response - HTTP response object
 * @param {number} expectedLength - Expected array length
 * @param {Object} itemProperties - Properties each item should have
 */
const assertArrayResponse = (response, expectedLength = null, itemProperties = []) => {
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(Array.isArray(response.body.data)).toBe(true);

  if (expectedLength !== null) {
    expect(response.body.data).toHaveLength(expectedLength);
  }

  if (itemProperties.length > 0 && response.body.data.length > 0) {
    const firstItem = response.body.data[0];
    itemProperties.forEach(prop => {
      expect(firstItem).toHaveProperty(prop);
    });
  }
};

/**
 * Assert that a model instance has expected properties
 * @param {Object} instance - Model instance
 * @param {Object} expectedProps - Expected property values
 */
const assertModelProperties = (instance, expectedProps) => {
  expect(instance).toBeDefined();

  Object.keys(expectedProps).forEach(key => {
    expect(instance[key]).toBe(expectedProps[key]);
  });
};

/**
 * Assert that a date string is valid and recent
 * @param {string} dateString - Date string to validate
 * @param {number} maxAgeMinutes - Maximum age in minutes (default: 5)
 */
const assertRecentDate = (dateString, maxAgeMinutes = 5) => {
  expect(dateString).toBeDefined();

  const date = new Date(dateString);
  expect(date).toBeInstanceOf(Date);
  expect(isNaN(date.getTime())).toBe(false);

  const now = new Date();
  const ageMinutes = (now - date) / (1000 * 60);
  expect(ageMinutes).toBeLessThan(maxAgeMinutes);
};

/**
 * Assert that audit log was created for an action
 * @param {Object} AuditLog - AuditLog model
 * @param {Object} criteria - Search criteria
 */
const assertAuditLogExists = async (AuditLog, criteria) => {
  const log = await AuditLog.findOne({ where: criteria });
  expect(log).toBeDefined();
  expect(log).not.toBeNull();
  return log;
};

/**
 * Assert that response contains validation errors for specific fields
 * @param {Object} response - HTTP response object
 * @param {Array<string>} fields - Array of field names
 */
const assertValidationErrors = (response, fields) => {
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);

  fields.forEach(field => {
    expect(response.body.message.toLowerCase()).toContain(field.toLowerCase());
  });
};

/**
 * Assert that a response indicates a conflict (duplicate resource)
 * @param {Object} response - HTTP response object
 * @param {string} field - Field that caused the conflict
 */
const assertConflict = (response, field = null) => {
  expect(response.status).toBe(409);
  expect(response.body.success).toBe(false);

  if (field) {
    expect(response.body.message.toLowerCase()).toContain(field.toLowerCase());
  }
};

/**
 * Assert that a response indicates rate limiting
 * @param {Object} response - HTTP response object
 */
const assertRateLimited = (response) => {
  expect(response.status).toBe(429);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toContain('rate limit');
};

/**
 * Assert that a response contains expected headers
 * @param {Object} response - HTTP response object
 * @param {Object} expectedHeaders - Expected header key-value pairs
 */
const assertHeaders = (response, expectedHeaders) => {
  Object.keys(expectedHeaders).forEach(header => {
    expect(response.headers[header.toLowerCase()]).toBe(expectedHeaders[header]);
  });
};

/**
 * Assert that response time is within acceptable range
 * @param {Object} response - HTTP response object (from supertest)
 * @param {number} maxMs - Maximum acceptable response time in milliseconds
 */
const assertResponseTime = (response, maxMs = 1000) => {
  // Note: Response time tracking needs to be implemented in the test
  if (response.headers['x-response-time']) {
    const responseTime = parseInt(response.headers['x-response-time']);
    expect(responseTime).toBeLessThan(maxMs);
  }
};

/**
 * Assert that an email field is valid
 * @param {string} email - Email to validate
 */
const assertValidEmail = (email) => {
  expect(email).toBeDefined();
  expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};

/**
 * Assert that a password meets security requirements
 * @param {string} password - Password to validate
 */
const assertValidPassword = (password) => {
  expect(password).toBeDefined();
  expect(password.length).toBeGreaterThanOrEqual(8);
  expect(password).toMatch(/[A-Z]/); // Has uppercase
  expect(password).toMatch(/[a-z]/); // Has lowercase
  expect(password).toMatch(/[0-9]/); // Has number
  expect(password).toMatch(/[!@#$%^&*(),.?":{}|<>]/); // Has special char
};

/**
 * Assert that response contains HIPAA compliance metadata
 * @param {Object} response - HTTP response object
 */
const assertHIPAACompliance = (response) => {
  expect(response.body).toHaveProperty('auditId');
  expect(response.body.auditId).toBeDefined();
  // Add other HIPAA-specific assertions as needed
};

module.exports = {
  assertValidationError,
  assertUnauthorized,
  assertForbidden,
  assertNotFound,
  assertSuccess,
  assertCreated,
  assertError,
  assertPagination,
  assertArrayResponse,
  assertModelProperties,
  assertRecentDate,
  assertAuditLogExists,
  assertValidationErrors,
  assertConflict,
  assertRateLimited,
  assertHeaders,
  assertResponseTime,
  assertValidEmail,
  assertValidPassword,
  assertHIPAACompliance
};
