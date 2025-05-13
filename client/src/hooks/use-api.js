import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// API base URL
const API_URL = 'http://localhost:8080/api';

/**
 * Custom hook for making API requests
 * @returns {Object} API request methods and state
 */
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, logout } = useAuth();

  // Configure axios
  useEffect(() => {
    // Add request interceptor for authentication
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // If token exists, add to headers
        if (token) {
          config.headers['x-access-token'] = token;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle authentication errors
        if (error.response?.status === 401) {
          // If unauthorized and user was authenticated, log them out
          if (isAuthenticated) {
            logout();
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Clean up interceptors on unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [isAuthenticated, logout]);

  /**
   * Make GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise} - Response data
   */
  const get = useCallback(async (endpoint, params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}${endpoint}`, { params });
      setLoading(false);
      return response.data;
    } catch (error) {
      setError(error.response?.data || { message: 'Network error' });
      setLoading(false);
      throw error;
    }
  }, []);

  /**
   * Make POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise} - Response data
   */
  const post = useCallback(async (endpoint, data = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}${endpoint}`, data);
      setLoading(false);
      return response.data;
    } catch (error) {
      setError(error.response?.data || { message: 'Network error' });
      setLoading(false);
      throw error;
    }
  }, []);

  /**
   * Make PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise} - Response data
   */
  const put = useCallback(async (endpoint, data = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`${API_URL}${endpoint}`, data);
      setLoading(false);
      return response.data;
    } catch (error) {
      setError(error.response?.data || { message: 'Network error' });
      setLoading(false);
      throw error;
    }
  }, []);

  /**
   * Make DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise} - Response data
   */
  const del = useCallback(async (endpoint) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.delete(`${API_URL}${endpoint}`);
      setLoading(false);
      return response.data;
    } catch (error) {
      setError(error.response?.data || { message: 'Network error' });
      setLoading(false);
      throw error;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    get,
    post,
    put,
    del,
    clearError
  };
};

/**
 * Custom hook for fetching data with automatic loading state
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @param {boolean} immediate - Whether to fetch data immediately
 * @returns {Object} Data fetch state and refetch function
 */
export const useFetch = (endpoint, params = {}, immediate = true) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { get } = useApi();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await get(endpoint, params);
      setData(response.data);
      return response;
    } catch (error) {
      setError(error.response?.data || { message: 'Failed to fetch data' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, params, get]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};

export default useApi;