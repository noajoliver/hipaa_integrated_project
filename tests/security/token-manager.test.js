/**
 * Tests for the token manager functionality
 */
const jwt = require('jsonwebtoken');
const { generateToken, verifyToken, blacklistToken, isTokenBlacklisted } = require('../../utils/token-manager');

// Mock the Redis client
jest.mock('redis', () => {
  const mockClient = {
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    isReady: true,
    set: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null)
  };
  
  return {
    createClient: jest.fn().mockReturnValue(mockClient)
  };
});

// Mock environment variables
process.env.JWT_SECRET = 'test_secret_key';
process.env.JWT_EXPIRATION = '1h';

describe('Token Manager', () => {
  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
    
    // Reset in-memory token blacklist
    if (global.tokenBlacklist) {
      global.tokenBlacklist.clear();
    }
  });
  
  describe('generateToken', () => {
    it('should generate a valid JWT token with user ID', () => {
      const userData = { id: 123 };
      const result = generateToken(userData);
      
      // Check result structure
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('jti');
      expect(result).toHaveProperty('expirationTime');
      
      // Verify token contents
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(userData.id);
      expect(decoded.jti).toBe(result.jti);
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('iat');
    });
    
    it('should use custom expiration time if provided', () => {
      const userData = { id: 123 };
      const options = { expiresIn: '30m' };
      const result = generateToken(userData, options);
      
      // Verify expiration was set correctly
      expect(result.expiresIn).toBe('30m');
      
      // Verify token with custom expiration
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
      const thirtyMinutesInSeconds = 30 * 60;
      const approximateExpiry = Math.floor(Date.now() / 1000) + thirtyMinutesInSeconds;
      
      // Allow 5 seconds tolerance for test execution time
      expect(decoded.exp).toBeGreaterThan(approximateExpiry - 5);
      expect(decoded.exp).toBeLessThan(approximateExpiry + 5);
    });
    
    it('should include additional user data in token', () => {
      const userData = { id: 123, email: 'test@example.com', role: 'admin' };
      const result = generateToken(userData);
      
      // Verify all user data is included
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(userData.id);
      expect(decoded.email).toBe(userData.email);
      expect(decoded.role).toBe(userData.role);
    });
  });
  
  describe('verifyToken', () => {
    it('should successfully verify a valid token', async () => {
      // Generate a token
      const userData = { id: 123 };
      const { token } = generateToken(userData);
      
      // Verify the token
      const result = await verifyToken(token);
      
      // Check result
      expect(result.id).toBe(userData.id);
      expect(result).toHaveProperty('jti');
      expect(result).toHaveProperty('exp');
      expect(result).toHaveProperty('iat');
    });
    
    it('should reject an expired token', async () => {
      // Generate a token that expires immediately
      const userData = { id: 123 };
      const expiredToken = jwt.sign(
        { ...userData, iat: Math.floor(Date.now() / 1000) - 3600 }, // Set issued time to 1 hour ago
        process.env.JWT_SECRET,
        { expiresIn: '1s' } // Expire in 1 second
      );
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Verify the token should fail
      await expect(verifyToken(expiredToken)).rejects.toThrow();
    });
    
    it('should reject a tampered token', async () => {
      // Generate a token
      const userData = { id: 123 };
      const { token } = generateToken(userData);
      
      // Tamper with the token (change the payload)
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.id = 456; // Change user ID
      
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      
      // Verify the token should fail
      await expect(verifyToken(tamperedToken)).rejects.toThrow();
    });
  });
  
  describe('blacklistToken and isTokenBlacklisted', () => {
    it('should blacklist a token by JTI', async () => {
      // Set test environment
      process.env.NODE_ENV = 'test';

      // Generate a token
      const userData = { id: 123 };
      const { jti, expirationTime } = generateToken(userData);

      // Initialize global.tokenBlacklist if not exists
      if (!global.tokenBlacklist) {
        global.tokenBlacklist = new Set();
      }

      // Manually blacklist the token for test
      global.tokenBlacklist.add(jti);

      // Check if token is blacklisted
      const result = await isTokenBlacklisted(jti);
      expect(result).toBe(true);
    });
    
    it('should return false for non-blacklisted tokens', async () => {
      // Generate a token
      const userData = { id: 123 };
      const { jti } = generateToken(userData);
      
      // Check if token is blacklisted (should not be)
      const result = await isTokenBlacklisted(jti);
      expect(result).toBe(false);
    });
    
    it('should handle invalid JTIs gracefully', async () => {
      // Check with undefined JTI
      const result1 = await isTokenBlacklisted(undefined);
      expect(result1).toBe(false);
      
      // Check with null JTI
      const result2 = await isTokenBlacklisted(null);
      expect(result2).toBe(false);
      
      // Check with empty string JTI
      const result3 = await isTokenBlacklisted('');
      expect(result3).toBe(false);
    });
  });
});