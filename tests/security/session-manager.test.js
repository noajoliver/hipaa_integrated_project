/**
 * Unit tests for Session Manager
 */
const {
  createSession,
  refreshSession,
  invalidateSession,
  getUserSessions,
  invalidateUserSessions,
  updateSessionActivity
} = require('../../utils/session-manager');
const { generateToken, blacklistToken } = require('../../utils/token-manager');
const { logger } = require('../../utils/logger');

// Mock Redis client
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();
const mockRedisKeys = jest.fn();
const mockRedismGet = jest.fn();
const mockRedisScan = jest.fn();
const mockRedisTtl = jest.fn();

// Mock dependencies
jest.mock('redis', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    isReady: true,
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    keys: mockRedisKeys,
    mGet: mockRedismGet,
    scan: mockRedisScan,
    ttl: mockRedisTtl
  }))
}));

jest.mock('../../utils/token-manager', () => ({
  generateToken: jest.fn().mockImplementation((data, options) => ({
    token: 'mock-token-' + Math.random(),
    jti: 'mock-jti-' + Math.random(),
    expiresIn: options.expiresIn,
    expirationTime: Math.floor(Date.now() / 1000) + 3600
  })),
  blacklistToken: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Session Manager', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default Redis responses
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);
    mockRedisKeys.mockResolvedValue([]);
    mockRedismGet.mockResolvedValue([]);
    mockRedisScan.mockResolvedValue({ cursor: 0, keys: [] });
    mockRedisTtl.mockResolvedValue(3600);
  });
  
  describe('createSession', () => {
    it('should create a new session with access and refresh tokens', async () => {
      const userData = {
        id: 1,
        username: 'testuser',
        roleId: 2,
        roleName: 'Admin'
      };
      
      const options = {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1'
      };
      
      const result = await createSession(userData, options);
      
      // Check tokens are generated
      expect(generateToken).toHaveBeenCalledTimes(2);
      expect(generateToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, sessionId: expect.any(String) }),
        expect.any(Object)
      );
      
      // Check session is stored in Redis
      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringMatching(/^session:/),
        expect.any(String),
        expect.any(Object)
      );
      
      // Check return value
      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('refreshExpiresIn');
    });
  });
  
  describe('refreshSession', () => {
    it('should refresh a session and generate a new access token', async () => {
      // Mock JWT decode function
      global.jwt = {
        verify: jest.fn().mockReturnValue({
          userId: 1,
          sessionId: 'test-session-id',
          tokenType: 'refresh',
          exp: Math.floor(Date.now() / 1000) + 3600
        })
      };
      
      // Mock session data in Redis
      mockRedisGet.mockResolvedValue(JSON.stringify({
        userId: 1,
        username: 'testuser',
        roleId: 2,
        accessToken: 'old-access-token-jti',
        refreshToken: 'refresh-token-jti',
        lastActivity: Date.now() - 1000
      }));
      
      const result = await refreshSession('valid-refresh-token');
      
      // Check old token is blacklisted
      expect(blacklistToken).toHaveBeenCalledWith('old-access-token-jti');
      
      // Check new token is generated
      expect(generateToken).toHaveBeenCalledWith(
        expect.objectContaining({ 
          id: 1,
          sessionId: 'test-session-id'
        }),
        expect.any(Object)
      );
      
      // Check session is updated in Redis
      expect(mockRedisSet).toHaveBeenCalled();
      
      // Check return value
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('expiresIn');
    });
    
    it('should fail for invalid refresh token', async () => {
      // Mock JWT decode function
      global.jwt = {
        verify: jest.fn().mockImplementation(() => {
          throw new Error('Invalid token');
        })
      };
      
      await expect(refreshSession('invalid-token')).rejects.toThrow();
    });
  });
  
  describe('invalidateSession', () => {
    it('should invalidate a session and blacklist tokens', async () => {
      // Mock JWT decode function
      global.jwt = {
        decode: jest.fn().mockImplementation(token => {
          if (token === 'access-token') {
            return { jti: 'access-jti', exp: 100000 };
          } else if (token === 'refresh-token') {
            return { jti: 'refresh-jti', exp: 200000 };
          }
          return null;
        })
      };
      
      const result = await invalidateSession(
        'test-session-id',
        'access-token',
        'refresh-token'
      );
      
      // Check tokens are blacklisted
      expect(blacklistToken).toHaveBeenCalledWith('access-jti', 100000);
      expect(blacklistToken).toHaveBeenCalledWith('refresh-jti', 200000);
      
      // Check session is deleted from Redis
      expect(mockRedisDel).toHaveBeenCalledWith('session:test-session-id');
      
      // Check return value
      expect(result).toBe(true);
    });
  });
  
  describe('getUserSessions', () => {
    it('should return all active sessions for a user', async () => {
      // Mock scan to return session keys
      mockRedisScan.mockResolvedValueOnce({
        cursor: 0,
        keys: ['session:abc123', 'session:def456']
      });
      
      // Mock mGet to return session data
      mockRedismGet.mockResolvedValueOnce([
        JSON.stringify({
          userId: 1,
          userAgent: 'Chrome',
          ipAddress: '192.168.1.1',
          lastActivity: Date.now() - 1000,
          expiresAt: Date.now() + 3600000
        }),
        JSON.stringify({
          userId: 1,
          userAgent: 'Firefox',
          ipAddress: '10.0.0.1',
          lastActivity: Date.now() - 2000,
          expiresAt: Date.now() + 3600000
        })
      ]);
      
      const sessions = await getUserSessions(1);
      
      // Check Redis scan was called
      expect(mockRedisScan).toHaveBeenCalledWith(0, expect.any(Object));
      
      // Check mGet was called with correct keys
      expect(mockRedismGet).toHaveBeenCalledWith(['session:abc123', 'session:def456']);
      
      // Check return value
      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toHaveProperty('sessionId', 'abc123');
      expect(sessions[0]).toHaveProperty('userAgent', 'Chrome');
      expect(sessions[1]).toHaveProperty('sessionId', 'def456');
      expect(sessions[1]).toHaveProperty('userAgent', 'Firefox');
    });
    
    it('should return empty array when no sessions exist', async () => {
      // Mock scan to return no keys
      mockRedisScan.mockResolvedValueOnce({ cursor: 0, keys: [] });
      
      const sessions = await getUserSessions(1);
      
      // Check Redis scan was called
      expect(mockRedisScan).toHaveBeenCalledWith(0, expect.any(Object));
      
      // Check return value
      expect(sessions).toHaveLength(0);
    });
  });
  
  describe('invalidateUserSessions', () => {
    it('should invalidate all sessions for a user', async () => {
      // Mock scan to return session keys
      mockRedisScan.mockResolvedValueOnce({
        cursor: 0,
        keys: ['session:abc123', 'session:def456']
      });
      
      // Mock mGet to return session data
      mockRedismGet.mockResolvedValueOnce([
        JSON.stringify({
          userId: 1,
          accessToken: 'access1',
          refreshToken: 'refresh1'
        }),
        JSON.stringify({
          userId: 1,
          accessToken: 'access2',
          refreshToken: 'refresh2'
        })
      ]);
      
      const count = await invalidateUserSessions(1);
      
      // Check blacklist token was called for each token
      expect(blacklistToken).toHaveBeenCalledTimes(4);
      
      // Check del was called for each session
      expect(mockRedisDel).toHaveBeenCalledTimes(2);
      
      // Check return value
      expect(count).toBe(2);
    });
  });
  
  describe('updateSessionActivity', () => {
    it('should update the last activity timestamp for a session', async () => {
      // Mock get to return session data
      mockRedisGet.mockResolvedValueOnce(JSON.stringify({
        userId: 1,
        lastActivity: Date.now() - 10000
      }));
      
      // Mock ttl to return time left
      mockRedisTtl.mockResolvedValueOnce(3000);
      
      const result = await updateSessionActivity('test-session-id');
      
      // Check session data was retrieved
      expect(mockRedisGet).toHaveBeenCalledWith('session:test-session-id');
      
      // Check ttl was called
      expect(mockRedisTtl).toHaveBeenCalledWith('session:test-session-id');
      
      // Check session was updated
      expect(mockRedisSet).toHaveBeenCalledWith(
        'session:test-session-id',
        expect.stringContaining('"lastActivity"'),
        expect.objectContaining({ EX: 3000 })
      );
      
      // Check return value
      expect(result).toBe(true);
    });
    
    it('should return false for non-existing session', async () => {
      // Mock get to return null
      mockRedisGet.mockResolvedValueOnce(null);
      
      const result = await updateSessionActivity('non-existent-session');
      
      // Check return value
      expect(result).toBe(false);
    });
  });
});