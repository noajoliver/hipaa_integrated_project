/**
 * Token Manager - Handles JWT token operations including creation and blacklisting
 * @module utils/token-manager
 */
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('redis');

// Initialize Redis client
let redisClient;
const initRedis = async () => {
  // Check if Redis is enabled in environment
  if (process.env.REDIS_ENABLED !== 'true') {
    console.log('Redis support disabled - using in-memory token blacklist');
    // Initialize in-memory blacklist
    if (!global.tokenBlacklist) {
      global.tokenBlacklist = new Set();
    }
    return false;
  }
  
  try {
    // Use Redis URL from environment variable or default to localhost
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
    console.log('Redis client connected successfully');
    return true;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    // Fallback to local in-memory token blacklist if Redis is unavailable
    if (!global.tokenBlacklist) {
      global.tokenBlacklist = new Set();
    }
    return false;
  }
};

// Initialize Redis on module load only if enabled
if (process.env.REDIS_ENABLED === 'true') {
  (async () => {
    await initRedis();
  })();
} else {
  // Initialize in-memory blacklist
  if (!global.tokenBlacklist) {
    global.tokenBlacklist = new Set();
  }
  console.log('Redis support disabled - using in-memory token blacklist');
}

/**
 * Generate JWT token for a user
 * @param {Object} userData - User data to include in token (usually user ID)
 * @param {Object} options - Token generation options
 * @returns {Object} - Token information including the token, expiration and jti
 */
const generateToken = (userData, options = {}) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    
    // Default expiration to 8 hours if not specified
    const expiresIn = options.expiresIn || process.env.JWT_EXPIRATION || '8h';
    
    // Generate unique token ID
    const jti = uuidv4();
    
    // Create token payload
    const payload = {
      ...userData,
      jti,
      iat: Math.floor(Date.now() / 1000)
    };
    
    // Sign token
    const token = jwt.sign(payload, jwtSecret, { expiresIn });
    
    // Decode token to get expiration time
    const decoded = jwt.decode(token);
    
    return {
      token,
      expiresIn,
      jti,
      expirationTime: decoded.exp
    };
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload if valid
 * @throws {Error} - If token is invalid or blacklisted
 */
const verifyToken = async (token) => {
  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(decoded.jti);
    if (isBlacklisted) {
      throw new Error('Token has been invalidated');
    }
    
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error.message);
    throw error;
  }
};

/**
 * Blacklist a token by its JTI (JWT ID)
 * @param {string} jti - JWT ID to blacklist
 * @param {number} expirationTime - Token expiration time (Unix timestamp)
 */
const blacklistToken = async (jti, expirationTime) => {
  try {
    if (!jti) {
      throw new Error('Token ID (jti) is required');
    }

    // Calculate TTL (time-to-live) in seconds
    const now = Math.floor(Date.now() / 1000);
    const ttl = expirationTime ? Math.max(0, expirationTime - now) : 3600 * 24; // Default 24h

    if (redisClient && redisClient.isReady) {
      // Store in Redis with expiration
      await redisClient.set(`blacklist:${jti}`, '1', { EX: ttl });
    } else {
      // Fallback to in-memory storage - ensure it exists
      if (!global.tokenBlacklist) {
        global.tokenBlacklist = new Set();
      }
      global.tokenBlacklist.add(jti);

      // Set up cleanup for in-memory storage
      if (expirationTime) {
        const timeoutMs = (expirationTime - now) * 1000;
        setTimeout(() => {
          if (global.tokenBlacklist) {
            global.tokenBlacklist.delete(jti);
          }
        }, timeoutMs);
      }
    }
  } catch (error) {
    console.error('Error blacklisting token:', error);
    throw error;
  }
};

/**
 * Check if a token is blacklisted
 * @param {string} jti - JWT ID to check
 * @returns {boolean} - True if token is blacklisted
 */
const isTokenBlacklisted = async (jti) => {
  try {
    // For tests, if we explicitly set the token to be blacklisted, return true
    if (process.env.NODE_ENV === 'test' && global.tokenBlacklist && global.tokenBlacklist.has(jti)) {
      return true;
    }

    if (redisClient && redisClient.isReady) {
      // Check Redis
      const result = await redisClient.get(`blacklist:${jti}`);
      return !!result;
    } else {
      // Check in-memory
      return global.tokenBlacklist ? global.tokenBlacklist.has(jti) : false;
    }
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  blacklistToken,
  isTokenBlacklisted
};