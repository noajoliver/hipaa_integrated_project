/**
 * Cache Configuration
 * @module config/cache-config
 */
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

/**
 * Cache configuration object
 */
const cacheConfig = {
  // Redis configuration
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || null,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'hc:',
    defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10) // 1 hour in seconds
  },
  
  // Memory cache configuration (fallback when Redis is unavailable)
  memoryCache: {
    enabled: true,
    maxSize: parseInt(process.env.MEMORY_CACHE_MAX_SIZE || '100', 10), // Max number of items
    defaultTTL: parseInt(process.env.MEMORY_CACHE_DEFAULT_TTL || '300', 10) // 5 minutes in seconds
  },
  
  // Cache keys for different resources
  keys: {
    user: (id) => `user:${id}`,
    users: 'users:list',
    document: (id) => `document:${id}`,
    documents: 'documents:list',
    training: (id) => `training:${id}`,
    trainings: 'trainings:list',
    incident: (id) => `incident:${id}`,
    incidents: 'incidents:list',
    dashboardStats: 'dashboard:stats',
    rolePermissions: (roleId) => `role:${roleId}:permissions`
  },
  
  // TTL (Time To Live) settings for different resource types
  ttl: {
    user: 1800, // 30 minutes
    users: 300, // 5 minutes
    document: 3600, // 1 hour
    documents: 600, // 10 minutes
    training: 3600, // 1 hour
    trainings: 600, // 10 minutes
    incident: 1800, // 30 minutes
    incidents: 300, // 5 minutes
    dashboardStats: 300, // 5 minutes
    rolePermissions: 3600 // 1 hour
  },
  
  // Cache bypass strategies
  bypass: {
    development: process.env.CACHE_BYPASS_DEV === 'true', // Bypass in development
    queryParam: process.env.CACHE_BYPASS_PARAM || '_no_cache' // URL param to bypass cache
  }
};

module.exports = cacheConfig;