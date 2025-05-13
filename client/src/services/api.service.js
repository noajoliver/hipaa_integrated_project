import axios from 'axios';

// API Configuration
const API_URL = 'http://localhost:8080/api';

// Add axios interceptors for token handling
const setupAxiosInterceptors = () => {
  // Request interceptor to add JWT token to headers
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['x-access-token'] = token;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor to handle errors
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle 401 unauthorized errors by redirecting to login
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

// Initialize interceptors
setupAxiosInterceptors();

// Generic API methods
const api = {
  /**
   * Generic GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - URL parameters
   * @returns {Promise} API response
   */
  get: async (endpoint, params = {}) => {
    try {
      const response = await axios.get(`${API_URL}${endpoint}`, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Generic POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @returns {Promise} API response
   */
  post: async (endpoint, data = {}) => {
    try {
      const response = await axios.post(`${API_URL}${endpoint}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Generic PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @returns {Promise} API response
   */
  put: async (endpoint, data = {}) => {
    try {
      const response = await axios.put(`${API_URL}${endpoint}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Generic DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise} API response
   */
  delete: async (endpoint) => {
    try {
      const response = await axios.delete(`${API_URL}${endpoint}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

/**
 * Normalize API error responses
 * @param {Error} error - Axios error object
 * @returns {Object} Normalized error object
 */
const handleApiError = (error) => {
  // Create a standard error object
  const standardError = {
    message: 'An unexpected error occurred',
    status: 500,
    data: null,
    errorCode: 'UNKNOWN_ERROR'
  };

  // Handle network errors
  if (!error.response) {
    standardError.message = 'Network error, please check your connection';
    standardError.errorCode = 'NETWORK_ERROR';
    return standardError;
  }

  // Handle API response errors
  const { data, status } = error.response;

  standardError.status = status;

  // Use the API's error structure if available
  if (data) {
    standardError.data = data;
    standardError.message = data.message || standardError.message;
    standardError.errorCode = data.errorCode || `HTTP_${status}`;
  }

  return standardError;
};

// Domain-specific API services
export const authService = {
  /**
   * Login with username and password
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise} Login response with token
   */
  login: (username, password) => {
    return api.post('/auth/signin', { username, password });
  },

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise} Registration response
   */
  register: (userData) => {
    return api.post('/auth/signup', userData);
  },

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise} Response
   */
  requestPasswordReset: (email) => {
    return api.post('/auth/request-password-reset', { email });
  },

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise} Response
   */
  resetPassword: (token, newPassword) => {
    return api.post('/auth/reset-password', { token, newPassword });
  },

  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise} Response
   */
  changePassword: (currentPassword, newPassword) => {
    return api.post('/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Log out user
   * @returns {Promise} Response
   */
  logout: () => {
    return api.post('/auth/signout');
  }
};

export const userService = {
  /**
   * Get all users
   * @returns {Promise} Users list
   */
  getAllUsers: () => {
    return api.get('/users');
  },

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise} User data
   */
  getUserById: (id) => {
    return api.get(`/users/${id}`);
  },

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise} Created user
   */
  createUser: (userData) => {
    return api.post('/users', userData);
  },

  /**
   * Update a user
   * @param {number} id - User ID
   * @param {Object} userData - User data
   * @returns {Promise} Updated user
   */
  updateUser: (id, userData) => {
    return api.put(`/users/${id}`, userData);
  },

  /**
   * Delete a user
   * @param {number} id - User ID
   * @returns {Promise} Response
   */
  deleteUser: (id) => {
    return api.delete(`/users/${id}`);
  },

  /**
   * Get all roles
   * @returns {Promise} Roles list
   */
  getAllRoles: () => {
    return api.get('/users/roles');
  },

  /**
   * Get all departments
   * @returns {Promise} Departments list
   */
  getAllDepartments: () => {
    return api.get('/users/departments');
  }
};

// Export the generic API and domain-specific services
export default api;