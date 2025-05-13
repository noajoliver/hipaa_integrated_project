/**
 * Cache Service Unit Tests
 * @module tests/unit/services/cache-service
 */

// Create mocks before requiring the service
jest.mock('redis', () => {
  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(),
    isReady: false,
    on: jest.fn().mockImplementation((event, callback) => {
      if (event === 'connect') {
        // Don't trigger connect callback to simulate Redis not connected
      }
      return mockRedisClient;
    }),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    scan: jest.fn().mockResolvedValue({ cursor: 0, keys: [] })
  };

  return {
    createClient: jest.fn().mockReturnValue(mockRedisClient)
  };
});

// Mock NodeCache
jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => {
    const cache = new Map();
    return {
      get: jest.fn((key) => cache.get(key)),
      set: jest.fn((key, value, ttl) => {
        cache.set(key, value);
        return true;
      }),
      del: jest.fn((key) => {
        cache.delete(key);
        return true;
      }),
      keys: jest.fn(() => Array.from(cache.keys())),
      flushAll: jest.fn(() => cache.clear())
    };
  });
});

// Mock cache config
jest.mock('../../../config/cache.config', () => ({
  redis: {
    enabled: true,
    url: 'redis://localhost:6379',
    keyPrefix: 'hc:',
    defaultTTL: 3600
  },
  memoryCache: {
    enabled: true,
    maxSize: 100,
    defaultTTL: 300
  },
  keys: {
    user: (id) => `user:${id}`,
    users: 'users:list'
  },
  ttl: {
    user: 1800,
    users: 300
  },
  bypass: {
    development: false,
    queryParam: '_no_cache'
  }
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

// Now require the service after all mocks are set up
const cacheService = require('../../../services/cache.service');

describe('Cache Service', () => {
  let redis;
  
  beforeEach(() => {
    jest.clearAllMocks();
    redis = require('redis');
  });
  
  describe('get', () => {
    it('should get value from memory cache when Redis is not connected', async () => {
      // Set up the mock to return a value
      const NodeCache = require('node-cache');
      const mockCache = NodeCache.mock.instances[0];
      mockCache.get.mockReturnValueOnce({ foo: 'bar' });

      const result = await cacheService.get('test-key');

      expect(result).toEqual({ foo: 'bar' });
      expect(mockCache.get).toHaveBeenCalledWith('hc:test-key');
    });

    it('should return null when key is not found in cache', async () => {
      // Set up the mock to return null
      const NodeCache = require('node-cache');
      const mockCache = NodeCache.mock.instances[0];
      mockCache.get.mockReturnValueOnce(null);

      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
      expect(mockCache.get).toHaveBeenCalledWith('hc:non-existent-key');
    });
  });

  describe('set', () => {
    it('should set value in memory cache when Redis is not connected', async () => {
      // Get the mock instance
      const NodeCache = require('node-cache');
      const mockCache = NodeCache.mock.instances[0];

      const value = { foo: 'bar' };
      const result = await cacheService.set('test-key', value, 300);

      expect(mockCache.set).toHaveBeenCalledWith('hc:test-key', value, 300);
    });
  });

  describe('del', () => {
    it('should delete value from memory cache', async () => {
      // Get the mock instance
      const NodeCache = require('node-cache');
      const mockCache = NodeCache.mock.instances[0];

      const result = await cacheService.del('test-key');

      expect(mockCache.del).toHaveBeenCalledWith('hc:test-key');
    });
  });

  describe('clear', () => {
    it('should clear values from memory cache matching pattern', async () => {
      // Get the mock instance
      const NodeCache = require('node-cache');
      const mockCache = NodeCache.mock.instances[0];

      // Mock the keys method to return test keys
      mockCache.keys.mockReturnValueOnce(['hc:user:1', 'hc:user:2', 'hc:document:1']);

      await cacheService.clear('user:*');

      expect(mockCache.keys).toHaveBeenCalled();
      expect(mockCache.del).toHaveBeenCalledWith('hc:user:1');
      expect(mockCache.del).toHaveBeenCalledWith('hc:user:2');
      // Should not delete document key
      expect(mockCache.del).not.toHaveBeenCalledWith('hc:document:1');
    });
  });
  
  describe('cacheMiddleware', () => {
    it('should bypass cache when method is not GET', () => {
      const middleware = cacheService.cacheMiddleware();
      const req = { method: 'POST', originalUrl: '/api/test' };
      const res = {};
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should bypass cache when query parameter is present', () => {
      const middleware = cacheService.cacheMiddleware();
      const req = { 
        method: 'GET', 
        originalUrl: '/api/test',
        query: { _no_cache: '1' }
      };
      const res = {};
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should return cached response on cache hit', async () => {
      // Mock the get method
      const mockGet = jest.spyOn(cacheService, 'get')
        .mockResolvedValueOnce({
          status: 200,
          body: { data: 'cached response' }
        });
      
      const middleware = cacheService.cacheMiddleware();
      const req = { method: 'GET', originalUrl: '/api/test' };
      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      await middleware(req, res, next);
      
      expect(mockGet).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: 'cached response' });
      expect(next).not.toHaveBeenCalled();
      
      // Clean up the mock
      mockGet.mockRestore();
    });
    
    it('should call next and setup cache on cache miss', async () => {
      // Mock the get method to return null (cache miss)
      const mockGet = jest.spyOn(cacheService, 'get')
        .mockResolvedValueOnce(null);
      
      // Create a spy for the set method
      const mockSet = jest.spyOn(cacheService, 'set')
        .mockResolvedValueOnce(true);
      
      const middleware = cacheService.cacheMiddleware({ ttl: 300 });
      const req = { method: 'GET', originalUrl: '/api/test' };
      const res = {
        setHeader: jest.fn(),
        statusCode: 200,
        json: jest.fn(function(body) {
          // Call the original implementation to trigger the cache save
          return body;
        })
      };
      const next = jest.fn(function() {
        // Simulate the controller sending a response
        res.json({ data: 'fresh response' });
      });
      
      await middleware(req, res, next);
      
      expect(mockGet).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
      expect(next).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        req.originalUrl,
        { status: 200, body: { data: 'fresh response' } },
        300
      );
      
      // Clean up the mocks
      mockGet.mockRestore();
      mockSet.mockRestore();
    });
  });
});