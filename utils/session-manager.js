/**
 * Session Manager - Handles secure user sessions
 * @module utils/session-manager
 */
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('redis');
const ms = require('ms');
const jwt = require('jsonwebtoken');
const { logger } = require('./logger');
const { generateToken, blacklistToken } = require('./token-manager');

// Initialize Redis client
let redisClient;
let redisConnected = false;

// Only initialize Redis if REDIS_URL is provided
const initRedis = async () => {
  // Check if REDIS_URL is provided in environment
  if (!process.env.REDIS_URL) {
    logger.info('REDIS_URL not set. Using in-memory session storage instead.');
    return false;
  }

  try {
    // Use Redis URL from environment variable
    const redisUrl = process.env.REDIS_URL;
    redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      redisConnected = false;
    });

    await redisClient.connect();
    logger.info('Redis client connected successfully for session management');
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis for session management:', error);
    return false;
  }
};

// Initialize Redis on module load only if REDIS_URL is set
if (process.env.REDIS_URL) {
  (async () => {
    redisConnected = await initRedis();
  })();
} else {
  logger.info('Redis support disabled - using in-memory session management');
}

/**
 * Create a new user session
 * HIPAA requires session management with automatic timeout
 * 
 * @param {Object} userData - User data to store in session
 * @param {Object} options - Session options
 * @returns {Object} Session information including token and refresh token
 */
const createSession = async (userData, options = {}) => {
  try {
    // Generate a unique session ID
    const sessionId = uuidv4();
    
    // Get session timeout from options, env or default to 30 minutes
    const sessionTimeout = options.timeout || process.env.SESSION_TIMEOUT || '30m';
    const sessionTimeoutMs = ms(sessionTimeout);
    
    // Get refresh token timeout from options, env or default to 7 days
    const refreshTimeout = options.refreshTimeout || process.env.REFRESH_TIMEOUT || '7d';
    const refreshTimeoutMs = ms(refreshTimeout);
    
    // Generate access token with session ID as jti
    const tokenInfo = generateToken({
      ...userData,
      sessionId
    }, { expiresIn: sessionTimeout });
    
    // Generate refresh token with different ID
    const refreshTokenInfo = generateToken({
      userId: userData.id,
      sessionId,
      tokenType: 'refresh'
    }, { expiresIn: refreshTimeout });
    
    // Store session data in Redis if available
    if (redisConnected && redisClient.isReady) {
      // Store session data with expiration
      const sessionData = {
        userId: userData.id,
        username: userData.username,
        roleId: userData.roleId,
        accessToken: tokenInfo.jti,
        refreshToken: refreshTokenInfo.jti,
        userAgent: options.userAgent || 'unknown',
        ipAddress: options.ipAddress || 'unknown',
        lastActivity: Date.now(),
        expiresAt: Date.now() + sessionTimeoutMs
      };
      
      await redisClient.set(
        `session:${sessionId}`, 
        JSON.stringify(sessionData), 
        { EX: Math.floor(refreshTimeoutMs / 1000) }
      );
    }
    
    return {
      sessionId,
      accessToken: tokenInfo.token,
      refreshToken: refreshTokenInfo.token,
      expiresIn: sessionTimeoutMs,
      refreshExpiresIn: refreshTimeoutMs
    };
  } catch (error) {
    logger.error('Error creating session:', error);
    throw error;
  }
};

/**
 * Validate and refresh session
 * 
 * @param {string} refreshToken - Refresh token
 * @param {Object} options - Refresh options
 * @returns {Object} New session tokens
 */
const refreshSession = async (refreshToken, options = {}) => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Check token type
    if (decoded.tokenType !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    // Get session from Redis
    if (redisConnected && redisClient.isReady) {
      const sessionData = await redisClient.get(`session:${decoded.sessionId}`);
      
      if (!sessionData) {
        throw new Error('Session not found or expired');
      }
      
      // Parse session data
      const session = JSON.parse(sessionData);
      
      // Verify session belongs to correct user
      if (session.userId !== decoded.userId) {
        throw new Error('Invalid session');
      }
      
      // Blacklist old access token
      await blacklistToken(session.accessToken);
      
      // Get user data for new token
      const userData = {
        id: session.userId,
        username: session.username,
        roleId: session.roleId
      };
      
      // Generate new access token
      const tokenInfo = generateToken({
        ...userData,
        sessionId: decoded.sessionId
      }, { expiresIn: options.timeout || process.env.SESSION_TIMEOUT || '30m' });
      
      // Update session in Redis
      session.accessToken = tokenInfo.jti;
      session.lastActivity = Date.now();
      
      // Calculate remaining time on refresh token
      const refreshExpiry = decoded.exp - Math.floor(Date.now() / 1000);
      
      await redisClient.set(
        `session:${decoded.sessionId}`, 
        JSON.stringify(session), 
        { EX: refreshExpiry }
      );
      
      return {
        accessToken: tokenInfo.token,
        expiresIn: tokenInfo.expiresIn
      };
    } else {
      // Fallback if Redis is not available
      // Less secure but allows basic functionality
      const userData = {
        id: decoded.userId,
        sessionId: decoded.sessionId
      };
      
      // Generate new access token
      const tokenInfo = generateToken({
        ...userData,
        sessionId: decoded.sessionId
      }, { expiresIn: options.timeout || process.env.SESSION_TIMEOUT || '30m' });
      
      return {
        accessToken: tokenInfo.token,
        expiresIn: tokenInfo.expiresIn
      };
    }
  } catch (error) {
    logger.error('Error refreshing session:', error);
    throw error;
  }
};

/**
 * Invalidate a user session
 * 
 * @param {string} sessionId - Session ID to invalidate
 * @param {string} accessToken - Access token to blacklist
 * @param {string} refreshToken - Refresh token to blacklist
 * @returns {boolean} Success status
 */
const invalidateSession = async (sessionId, accessToken, refreshToken) => {
  try {
    // Blacklist access token if provided
    if (accessToken) {
      const decoded = jwt.decode(accessToken);
      if (decoded && decoded.jti) {
        await blacklistToken(decoded.jti, decoded.exp);
      }
    }
    
    // Blacklist refresh token if provided
    if (refreshToken) {
      const decoded = jwt.decode(refreshToken);
      if (decoded && decoded.jti) {
        await blacklistToken(decoded.jti, decoded.exp);
      }
    }
    
    // Remove session from Redis if connected
    if (redisConnected && redisClient.isReady && sessionId) {
      await redisClient.del(`session:${sessionId}`);
    }
    
    return true;
  } catch (error) {
    logger.error('Error invalidating session:', error);
    // Return true even if there's an error to ensure user is logged out
    return true;
  }
};

/**
 * Get all active sessions for a user
 * 
 * @param {number} userId - User ID to get sessions for
 * @returns {Array} List of active sessions
 */
const getUserSessions = async (userId) => {
  const sessions = [];
  
  try {
    if (redisConnected && redisClient.isReady) {
      // Scan Redis for user sessions
      let cursor = 0;
      do {
        const result = await redisClient.scan(cursor, {
          MATCH: 'session:*',
          COUNT: 100
        });
        
        cursor = result.cursor;
        
        // Process batched session keys
        if (result.keys.length > 0) {
          const sessionData = await redisClient.mGet(result.keys);
          
          for (let i = 0; i < sessionData.length; i++) {
            if (sessionData[i]) {
              const session = JSON.parse(sessionData[i]);
              
              if (session.userId === userId) {
                sessions.push({
                  sessionId: result.keys[i].split(':')[1],
                  userAgent: session.userAgent,
                  ipAddress: session.ipAddress,
                  lastActivity: new Date(session.lastActivity),
                  expiresAt: new Date(session.expiresAt)
                });
              }
            }
          }
        }
      } while (cursor !== 0);
    }
    
    return sessions;
  } catch (error) {
    logger.error('Error getting user sessions:', error);
    return [];
  }
};

/**
 * Invalidate all sessions for a user (force logout from all devices)
 * 
 * @param {number} userId - User ID to invalidate sessions for
 * @returns {number} Number of invalidated sessions
 */
const invalidateUserSessions = async (userId) => {
  let count = 0;
  
  try {
    if (redisConnected && redisClient.isReady) {
      // Scan Redis for user sessions
      let cursor = 0;
      do {
        const result = await redisClient.scan(cursor, {
          MATCH: 'session:*',
          COUNT: 100
        });
        
        cursor = result.cursor;
        
        // Process batched session keys
        if (result.keys.length > 0) {
          const sessionData = await redisClient.mGet(result.keys);
          
          for (let i = 0; i < sessionData.length; i++) {
            if (sessionData[i]) {
              const session = JSON.parse(sessionData[i]);
              
              if (session.userId === userId) {
                // Blacklist tokens
                await blacklistToken(session.accessToken);
                await blacklistToken(session.refreshToken);
                
                // Delete session
                await redisClient.del(result.keys[i]);
                count++;
              }
            }
          }
        }
      } while (cursor !== 0);
    }
    
    return count;
  } catch (error) {
    logger.error('Error invalidating user sessions:', error);
    return count;
  }
};

/**
 * Update user's session activity
 * 
 * @param {string} sessionId - Session ID to update
 * @returns {boolean} Success status
 */
const updateSessionActivity = async (sessionId) => {
  try {
    if (redisConnected && redisClient.isReady && sessionId) {
      // Get current session data
      const sessionData = await redisClient.get(`session:${sessionId}`);
      
      if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // Update last activity
        session.lastActivity = Date.now();
        
        // Calculate remaining time
        const ttl = await redisClient.ttl(`session:${sessionId}`);
        
        // Only update if session still exists
        if (ttl > 0) {
          await redisClient.set(
            `session:${sessionId}`, 
            JSON.stringify(session), 
            { EX: ttl }
          );
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    logger.error('Error updating session activity:', error);
    return false;
  }
};

module.exports = {
  createSession,
  refreshSession,
  invalidateSession,
  getUserSessions,
  invalidateUserSessions,
  updateSessionActivity
};