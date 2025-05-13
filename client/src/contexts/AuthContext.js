import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import jwt_decode from 'jwt-decode';

// Create auth context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

// API URL - should be configured based on where your backend is deployed
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requireMfa, setRequireMfa] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  // Configure axios defaults
  useEffect(() => {
    // Enable cookies in requests
    axios.defaults.withCredentials = true;
    
    // Set CSRF token from cookie if available
    const getCsrfToken = async () => {
      try {
        await axios.get(`${API_URL}/auth/csrf-token`);
      } catch (error) {
        console.error('Failed to get CSRF token:', error);
      }
    };
    
    getCsrfToken();
  }, []);

  // Check if user is already logged in (on component mount)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Try to get user profile - will fail if not authenticated
        const response = await axios.get(`${API_URL}/auth/profile`);
        
        if (response.data.success) {
          setUser(response.data.data);
          setIsAuthenticated(true);
          setRequirePasswordChange(false);
        }
      } catch (error) {
        // If error status is 403 and password change required
        if (error.response?.status === 403 && 
            error.response?.data?.errorCode === 'AUTH_PASSWORD_CHANGE_REQUIRED') {
          setRequirePasswordChange(true);
          
          // Still consider authenticated but need password change
          setIsAuthenticated(true);
        } else if (error.response?.status === 403 && 
                  error.response?.data?.errorCode === 'MFA_REQUIRED') {
          // MFA is required - set state accordingly
          setRequireMfa(true);
          setSessionId(error.response?.data?.sessionId);
        } else {
          // Not authenticated
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Login function
  const login = async (username, password) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });
      
      const { requireMfa, sessionId, requirePasswordChange, user: userData } = response.data;
      
      if (requireMfa) {
        // MFA required - set state for MFA verification
        setRequireMfa(true);
        setSessionId(sessionId);
        setIsLoading(false);
        return { success: true, requireMfa: true, sessionId };
      }
      
      // Set requirePasswordChange if returned from API
      if (requirePasswordChange) {
        setRequirePasswordChange(true);
      }
      
      // Update state with user data
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, requirePasswordChange };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify MFA token
  const verifyMfa = async (token, sessionId) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/verify-mfa`, {
        token,
        sessionId
      });
      
      if (response.data.success) {
        // Update user and auth state
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        setRequireMfa(false);
        setSessionId(null);
        
        // Check if password change is required
        if (response.data.data.requirePasswordChange) {
          setRequirePasswordChange(true);
        }
        
        return response.data;
      }
      
      return { success: false, message: 'Failed to verify MFA token' };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'MFA verification failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify backup code
  const verifyBackupCode = async (code, sessionId) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/verify-backup-code`, {
        code,
        sessionId
      });
      
      if (response.data.success) {
        // Update user and auth state
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        setRequireMfa(false);
        setSessionId(null);
        
        // Check if password change is required
        if (response.data.data.requirePasswordChange) {
          setRequirePasswordChange(true);
        }
        
        return response.data;
      }
      
      return { success: false, message: 'Failed to verify backup code' };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Backup code verification failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Setup MFA
  const enableMfa = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/enable-mfa`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to initialize MFA setup. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm MFA setup with verification token
  const confirmMfa = async (token) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/confirm-mfa`, { token });
      
      if (response.data.success) {
        // Update user MFA status
        setUser(prev => ({
          ...prev,
          mfaEnabled: true
        }));
      }
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to verify MFA setup. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Disable MFA
  const disableMfa = async (token) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/disable-mfa`, { token });
      
      if (response.data.success) {
        // Update user MFA status
        setUser(prev => ({
          ...prev,
          mfaEnabled: false
        }));
      }
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to disable MFA. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/change-password`, {
        currentPassword,
        newPassword
      });
      
      if (response.data.success) {
        // Reset password change requirement
        setRequirePasswordChange(false);
      }
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Get active sessions
  const getSessions = async () => {
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/auth/sessions`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to get sessions. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Revoke a specific session
  const revokeSession = async (sessionId) => {
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/auth/revoke-session`, { sessionId });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to revoke session. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout from all devices
  const logoutAll = async () => {
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/auth/logout-all`);
      
      if (response.data.success) {
        // Update auth state
        setUser(null);
        setIsAuthenticated(false);
        setRequireMfa(false);
        setSessionId(null);
        setRequirePasswordChange(false);
      }
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to logout from all devices. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Always clear user data even if API call fails
      setUser(null);
      setIsAuthenticated(false);
      setRequireMfa(false);
      setSessionId(null);
      setRequirePasswordChange(false);
    }
  };

  // Setup security questions
  const setupSecurityQuestions = async (questions) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/setup-security-questions`, { questions });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to set up security questions. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify security questions
  const verifySecurityQuestions = async (username, answers) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/verify-security-questions`, {
        username,
        answers
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to verify security questions. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password with token
  const resetPassword = async (token, newPassword) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, { 
        token, 
        newPassword 
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password reset failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await axios.put(`${API_URL}/users/profile`, userData);
      
      if (response.data.success) {
        setUser({...user, ...response.data.data});
      }
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    if (!user || !user.role) return false;
    return user.role.name === role;
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!user || !user.role || !user.role.permissions) return false;
    return !!user.role.permissions[permission];
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    if (!user || !user.role) return false;
    return roles.includes(user.role.name);
  };

  // Provide auth context value
  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    requireMfa,
    sessionId,
    requirePasswordChange,
    login,
    logout,
    logoutAll,
    verifyMfa,
    verifyBackupCode,
    enableMfa,
    confirmMfa,
    disableMfa,
    changePassword,
    getSessions,
    revokeSession,
    setupSecurityQuestions,
    verifySecurityQuestions,
    resetPassword,
    updateProfile,
    hasRole,
    hasPermission,
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};