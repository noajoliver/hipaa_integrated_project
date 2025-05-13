/**
 * Cache Service - Provides caching capabilities with Redis and in-memory fallback
 * @module services/cache
 */
const { createClient } = require('redis');
const NodeCache = require('node-cache');
const cacheConfig = require('../config/cache.config');
const logger = require('../utils/logger');

// Create in-memory cache as fallback
const memoryCache = new NodeCache({
  stdTTL: cacheConfig.memoryCache.defaultTTL,
  maxKeys: cacheConfig.memoryCache.maxSize,
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Don't clone objects when getting/setting (for performance)
});

// Initialize Redis client
let redisClient = null;
let redisConnected = false;

/**
 * Initialize Redis connection
 * @returns {Promise<boolean>} Connection success
 */
const initRedis = async () => {
  if (!cacheConfig.redis.enabled) {
    logger.info('Redis caching is disabled');
    return false;
  }
  
  try {
    redisClient = createClient({
      url: cacheConfig.redis.url,
      password: cacheConfig.redis.password,
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      redisConnected = false;
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
      redisConnected = true;
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('Redis Client Reconnecting');
    });
    
    await redisClient.connect();
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    redisConnected = false;
    return false;
  }
};

// Initialize Redis on startup
if (cacheConfig.redis.enabled) {
  initRedis().catch(err => {
    logger.error('Redis initialization error:', err);
  });
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value or null
 */
const get = async (key) => {
  const prefixedKey = `${cacheConfig.redis.keyPrefix}${key}`;
  
  // Check redis if connected
  if (redisConnected && redisClient) {
    try {
      const value = await redisClient.get(prefixedKey);
      if (value) {
        return JSON.parse(value);
      }
    } catch (error) {
      logger.error(`Redis GET error for key ${prefixedKey}:`, error);
    }
  }
  
  // Fallback to memory cache
  if (cacheConfig.memoryCache.enabled) {
    return memoryCache.get(prefixedKey);
  }
  
  return null;
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
const set = async (key, value, ttl = cacheConfig.redis.defaultTTL) => {
  const prefixedKey = `${cacheConfig.redis.keyPrefix}${key}`;
  
  // Store in redis if connected
  if (redisConnected && redisClient) {
    try {
      await redisClient.set(prefixedKey, JSON.stringify(value), { EX: ttl });
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${prefixedKey}:`, error);
    }
  }
  
  // Fallback to memory cache
  if (cacheConfig.memoryCache.enabled) {
    return memoryCache.set(prefixedKey, value, ttl);
  }
  
  return false;
};

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
const del = async (key) => {
  const prefixedKey = `${cacheConfig.redis.keyPrefix}${key}`;
  
  // Delete from redis if connected
  if (redisConnected && redisClient) {
    try {
      await redisClient.del(prefixedKey);
    } catch (error) {
      logger.error(`Redis DEL error for key ${prefixedKey}:`, error);
    }
  }
  
  // Delete from memory cache
  if (cacheConfig.memoryCache.enabled) {
    memoryCache.del(prefixedKey);
  }
  
  return true;
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Key pattern to match (e.g., 'user:*')
 * @returns {Promise<boolean>} Success status
 */
const clear = async (pattern) => {
  const prefixedPattern = `${cacheConfig.redis.keyPrefix}${pattern}`;
  
  // Clear from redis if connected
  if (redisConnected && redisClient) {
    try {
      // Using SCAN for safer key deletion in production
      let cursor = 0;
      do {
        const { cursor: newCursor, keys } = await redisClient.scan(cursor, {
          MATCH: prefixedPattern,
          COUNT: 100
        });
        
        cursor = newCursor;
        
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } while (cursor !== 0);
    } catch (error) {
      logger.error(`Redis CLEAR error for pattern ${prefixedPattern}:`, error);
    }
  }
  
  // Clear matching keys from memory cache
  if (cacheConfig.memoryCache.enabled) {
    const keys = memoryCache.keys();
    const regex = new RegExp(prefixedPattern.replace('*', '.*'));
    
    keys.forEach(key => {
      if (regex.test(key)) {
        memoryCache.del(key);
      }
    });
  }
  
  return true;
};

/**
 * Check if the cache should be bypassed based on configuration and request
 * @param {Object} req - Express request object 
 * @returns {boolean} True if cache should be bypassed
 */
const shouldBypass = (req) => {
  // Bypass in development if configured
  if (cacheConfig.bypass.development && process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // Bypass if query parameter is present
  if (req.query && cacheConfig.bypass.queryParam in req.query) {
    return true;
  }
  
  return false;
};

/**
 * Express middleware for caching API responses
 * @param {Object} options - Caching options
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (options = {}) => {
  const ttl = options.ttl || cacheConfig.redis.defaultTTL;
  const keyFn = options.key || (req => req.originalUrl);
  
  return async (req, res, next) => {
    // Skip cache if configured to bypass
    if (shouldBypass(req)) {
      return next();
    }
    
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Generate cache key
    const key = keyFn(req);
    
    try {
      // Try to get from cache
      const data = await get(key);
      
      if (data) {
        // Send cached response
        res.setHeader('X-Cache', 'HIT');
        return res.status(data.status).json(data.body);
      }
      
      // Cache miss - continue to handler but intercept response
      res.setHeader('X-Cache', 'MISS');
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(body) {
        // Restore original json method
        res.json = originalJson;
        
        // Cache response data
        const responseData = {
          status: res.statusCode,
          body: body
        };
        
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          set(key, responseData, ttl).catch(err => {
            logger.error(`Failed to cache response for ${key}:`, err);
          });
        }
        
        // Call original json method
        return originalJson.call(this, body);
      };
      
      next();
    } catch (error) {
      logger.error(`Cache middleware error for ${key}:`, error);
      next();
    }
  };
};

module.exports = {
  get,
  set,
  del,
  clear,
  shouldBypass,
  cacheMiddleware,
  initRedis
};