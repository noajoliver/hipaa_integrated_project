/**
 * API Request Helpers for Testing
 *
 * Provides utilities for making common API requests
 * with proper authentication and formatting.
 *
 * @module tests/utils/api-helpers
 */

const { authenticatedRequest } = require('./auth-helpers');

/**
 * Make authenticated GET request
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {string} path - API endpoint path
 * @param {Object} user - User object for authentication
 * @param {Object} query - Optional query parameters
 * @returns {Promise<Object>} Response object
 */
const authenticatedGet = async (app, request, path, user, query = {}) => {
  let req = authenticatedRequest(request(app).get(path), user);

  // Add query parameters if provided
  if (Object.keys(query).length > 0) {
    req = req.query(query);
  }

  return await req;
};

/**
 * Make authenticated POST request
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {string} path - API endpoint path
 * @param {Object} user - User object for authentication
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response object
 */
const authenticatedPost = async (app, request, path, user, body = {}) => {
  return await authenticatedRequest(request(app).post(path), user)
    .send(body)
    .set('Content-Type', 'application/json');
};

/**
 * Make authenticated PUT request
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {string} path - API endpoint path
 * @param {Object} user - User object for authentication
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response object
 */
const authenticatedPut = async (app, request, path, user, body = {}) => {
  return await authenticatedRequest(request(app).put(path), user)
    .send(body)
    .set('Content-Type', 'application/json');
};

/**
 * Make authenticated PATCH request
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {string} path - API endpoint path
 * @param {Object} user - User object for authentication
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response object
 */
const authenticatedPatch = async (app, request, path, user, body = {}) => {
  return await authenticatedRequest(request(app).patch(path), user)
    .send(body)
    .set('Content-Type', 'application/json');
};

/**
 * Make authenticated DELETE request
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {string} path - API endpoint path
 * @param {Object} user - User object for authentication
 * @returns {Promise<Object>} Response object
 */
const authenticatedDelete = async (app, request, path, user) => {
  return await authenticatedRequest(request(app).delete(path), user);
};

/**
 * Make unauthenticated request (useful for testing auth failures)
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - API endpoint path
 * @param {Object} body - Request body (for POST/PUT/PATCH)
 * @returns {Promise<Object>} Response object
 */
const unauthenticatedRequest = async (app, request, method, path, body = null) => {
  const req = request(app)[method.toLowerCase()](path);

  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    req.send(body).set('Content-Type', 'application/json');
  }

  return await req;
};

/**
 * Create a user via API
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {Object} admin - Admin user for authentication
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user response
 */
const createUserViaAPI = async (app, request, admin, userData) => {
  return await authenticatedPost(app, request, '/api/users', admin, userData);
};

/**
 * Create a training course via API
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {Object} admin - Admin user for authentication
 * @param {Object} courseData - Course data
 * @returns {Promise<Object>} Created course response
 */
const createCourseViaAPI = async (app, request, admin, courseData) => {
  return await authenticatedPost(app, request, '/api/training/courses', admin, courseData);
};

/**
 * Create a document via API
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {Object} user - User for authentication
 * @param {Object} documentData - Document data
 * @returns {Promise<Object>} Created document response
 */
const createDocumentViaAPI = async (app, request, user, documentData) => {
  return await authenticatedPost(app, request, '/api/documents', user, documentData);
};

/**
 * Create an incident via API
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {Object} user - User for authentication
 * @param {Object} incidentData - Incident data
 * @returns {Promise<Object>} Created incident response
 */
const createIncidentViaAPI = async (app, request, user, incidentData) => {
  return await authenticatedPost(app, request, '/api/incidents', user, incidentData);
};

/**
 * Create a risk assessment via API
 * @param {Object} app - Express app instance
 * @param {Function} request - Supertest request function
 * @param {Object} user - User for authentication
 * @param {Object} assessmentData - Assessment data
 * @returns {Promise<Object>} Created assessment response
 */
const createRiskAssessmentViaAPI = async (app, request, user, assessmentData) => {
  return await authenticatedPost(app, request, '/api/risks/assessments', user, assessmentData);
};

/**
 * Build query string from object
 * @param {Object} params - Query parameters
 * @returns {string} Query string
 */
const buildQueryString = (params) => {
  const queryParts = [];
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    }
  });
  return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
};

/**
 * Wait for a specific condition to be true
 * @param {Function} condition - Async function that returns boolean
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<boolean>} True if condition met, false if timeout
 */
const waitForCondition = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
};

/**
 * Retry a request if it fails
 * @param {Function} requestFn - Async function that makes the request
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Delay between retries in milliseconds
 * @returns {Promise<Object>} Response object
 */
const retryRequest = async (requestFn, maxRetries = 3, delayMs = 1000) => {
  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
};

/**
 * Extract ID from response
 * @param {Object} response - API response
 * @returns {number|null} Extracted ID or null
 */
const extractId = (response) => {
  if (response.body && response.body.data && response.body.data.id) {
    return response.body.data.id;
  }
  return null;
};

/**
 * Batch create resources via API
 * @param {Function} createFn - Function to create a single resource
 * @param {Array<Object>} dataArray - Array of data objects
 * @returns {Promise<Array<Object>>} Array of created resources
 */
const batchCreate = async (createFn, dataArray) => {
  const results = [];
  for (const data of dataArray) {
    const response = await createFn(data);
    results.push(response);
  }
  return results;
};

/**
 * Parse pagination headers
 * @param {Object} response - API response
 * @returns {Object} Pagination metadata
 */
const parsePaginationHeaders = (response) => {
  const pagination = {};

  if (response.headers['x-total-count']) {
    pagination.totalCount = parseInt(response.headers['x-total-count']);
  }

  if (response.headers['x-page']) {
    pagination.page = parseInt(response.headers['x-page']);
  }

  if (response.headers['x-per-page']) {
    pagination.perPage = parseInt(response.headers['x-per-page']);
  }

  if (response.headers['link']) {
    pagination.links = parseLinkHeader(response.headers['link']);
  }

  return pagination;
};

/**
 * Parse Link header
 * @param {string} linkHeader - Link header value
 * @returns {Object} Parsed links
 */
const parseLinkHeader = (linkHeader) => {
  const links = {};
  const parts = linkHeader.split(',');

  parts.forEach(part => {
    const match = part.match(/<(.+)>;\s*rel="(.+)"/);
    if (match) {
      links[match[2]] = match[1];
    }
  });

  return links;
};

/**
 * Format date for API request
 * @param {Date} date - Date object
 * @returns {string} ISO formatted date string
 */
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Format datetime for API request
 * @param {Date} date - Date object
 * @returns {string} ISO formatted datetime string
 */
const formatDateTime = (date) => {
  return date.toISOString();
};

module.exports = {
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedPatch,
  authenticatedDelete,
  unauthenticatedRequest,
  createUserViaAPI,
  createCourseViaAPI,
  createDocumentViaAPI,
  createIncidentViaAPI,
  createRiskAssessmentViaAPI,
  buildQueryString,
  waitForCondition,
  retryRequest,
  extractId,
  batchCreate,
  parsePaginationHeaders,
  parseLinkHeader,
  formatDate,
  formatDateTime
};
