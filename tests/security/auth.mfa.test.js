/**
 * Integration tests for MFA authentication
 */
const request = require('supertest');
const app = require('../../server');
const { User } = require('../../models');
const { encrypt } = require('../../utils/encryption');
const speakeasy = require('speakeasy');
const bcrypt = require('bcrypt');

// Mock dependencies for isolated testing
jest.mock('../../models', () => {
  const mockUser = {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    save: jest.fn()
  };

  return {
    User: mockUser,
    Op: { or: jest.fn() }
  };
});

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn().mockReturnValue({
    base32: 'ABCDEFGHIJKLMNOP',
    otpauth_url: 'otpauth://totp/HIPAA%20App:testuser?secret=ABCDEFGHIJKLMNOP'
  }),
  totp: {
    verify: jest.fn().mockReturnValue(true),
    generate: jest.fn().mockReturnValue('123456')
  }
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,QRCODE')
}));

// Mock Redis for session management
jest.mock('redis', () => {
  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    isReady: true,
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(3600)
  };

  return {
    createClient: jest.fn().mockReturnValue(mockRedisClient)
  };
});

describe('MFA Authentication', () => {
  let userWithMfa, userWithoutMfa, agent;

  beforeAll(() => {
    // Setup test users
    userWithMfa = {
      id: 1,
      username: 'mfauser',
      email: 'mfa@example.com',
      password: bcrypt.hashSync('Password123!', 10),
      firstName: 'MFA',
      lastName: 'User',
      mfaEnabled: true,
      mfaSecret: encrypt('ABCDEFGHIJKLMNOP'),
      accountStatus: 'active',
      role: { id: 2, name: 'User' },
      backupCodes: JSON.stringify([
        { code: bcrypt.hashSync('ABCD1234', 5), used: false },
        { code: bcrypt.hashSync('EFGH5678', 5), used: false }
      ]),
      toJSON: () => ({
        id: 1,
        username: 'mfauser',
        firstName: 'MFA',
        lastName: 'User',
        email: 'mfa@example.com',
        mfaEnabled: true,
        role: { id: 2, name: 'User' }
      })
    };

    userWithoutMfa = {
      id: 2,
      username: 'regular',
      email: 'regular@example.com',
      password: bcrypt.hashSync('Password123!', 10),
      firstName: 'Regular',
      lastName: 'User',
      mfaEnabled: false,
      accountStatus: 'active',
      role: { id: 2, name: 'User' },
      toJSON: () => ({
        id: 2,
        username: 'regular',
        firstName: 'Regular',
        lastName: 'User',
        email: 'regular@example.com',
        mfaEnabled: false,
        role: { id: 2, name: 'User' }
      })
    };

    // Setup test agent to maintain cookies
    agent = request.agent(app);
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup User.findOne mock for authentication
    User.findOne.mockImplementation((query) => {
      if (query.where.username === 'mfauser') {
        return Promise.resolve(userWithMfa);
      } else if (query.where.username === 'regular') {
        return Promise.resolve(userWithoutMfa);
      }
      return Promise.resolve(null);
    });

    // Setup User.findByPk mock
    User.findByPk.mockImplementation((id) => {
      if (id === 1) {
        return Promise.resolve(userWithMfa);
      } else if (id === 2) {
        return Promise.resolve(userWithoutMfa);
      }
      return Promise.resolve(null);
    });
  });

  describe('Login with MFA', () => {
    it('should require MFA verification after login', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({
          username: 'mfauser',
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.requireMfa).toBe(true);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.message).toContain('MFA verification required');
    });

    it('should not require MFA for users without MFA enabled', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({
          username: 'regular',
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.requireMfa).toBeUndefined();
      expect(response.body.message).not.toContain('MFA verification required');
    });

    it('should verify valid MFA token', async () => {
      // First login to get session ID
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          username: 'mfauser',
          password: 'Password123!'
        });

      const sessionId = loginResponse.body.sessionId;

      // Now verify MFA token
      const mfaResponse = await agent
        .post('/api/auth/verify-mfa')
        .send({
          token: '123456',
          sessionId
        });

      expect(mfaResponse.status).toBe(200);
      expect(mfaResponse.body.success).toBe(true);
      expect(mfaResponse.body.message).toContain('MFA verification successful');
      expect(mfaResponse.body.data.user).toBeDefined();
    });

    it('should reject invalid MFA token', async () => {
      // Mock speakeasy.totp.verify to return false for this test
      speakeasy.totp.verify.mockReturnValueOnce(false);

      // First login to get session ID
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          username: 'mfauser',
          password: 'Password123!'
        });

      const sessionId = loginResponse.body.sessionId;

      // Now verify with invalid MFA token
      const mfaResponse = await agent
        .post('/api/auth/verify-mfa')
        .send({
          token: '999999',
          sessionId
        });

      expect(mfaResponse.status).toBe(401);
      expect(mfaResponse.body.success).toBe(false);
      expect(mfaResponse.body.message).toContain('Invalid MFA token');
    });

    it('should verify valid backup code', async () => {
      // Mock bcrypt.compare to simulate a valid backup code
      bcrypt.compare = jest.fn().mockImplementation((code, hash) => {
        return Promise.resolve(code === 'ABCD1234');
      });

      // First login to get session ID
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          username: 'mfauser',
          password: 'Password123!'
        });

      const sessionId = loginResponse.body.sessionId;

      // Now verify with backup code
      const backupResponse = await agent
        .post('/api/auth/verify-backup-code')
        .send({
          code: 'ABCD1234',
          sessionId
        });

      expect(backupResponse.status).toBe(200);
      expect(backupResponse.body.success).toBe(true);
      expect(backupResponse.body.message).toContain('Backup code verification successful');
    });
  });

  describe('MFA Setup', () => {
    it('should initialize MFA setup', async () => {
      // Login as regular user first (no MFA)
      await agent
        .post('/api/auth/login')
        .send({
          username: 'regular',
          password: 'Password123!'
        });

      // Attempt to enable MFA
      const response = await agent
        .post('/api/auth/enable-mfa');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.data.secret).toBeDefined();
    });

    it('should confirm MFA setup with valid token', async () => {
      // Mock speakeasy.totp.verify to return true
      speakeasy.totp.verify.mockReturnValueOnce(true);

      // Mock User.update to simulate enabling MFA
      User.update.mockResolvedValueOnce([1]);

      // Login as regular user first (no MFA)
      await agent
        .post('/api/auth/login')
        .send({
          username: 'regular',
          password: 'Password123!'
        });

      // Confirm MFA setup
      const response = await agent
        .post('/api/auth/confirm-mfa')
        .send({
          token: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.backupCodes).toBeDefined();
      expect(response.body.data.backupCodes.length).toBe(10);
    });

    it('should disable MFA with valid token', async () => {
      // Mock speakeasy.totp.verify to return true
      speakeasy.totp.verify.mockReturnValueOnce(true);

      // Login as MFA user first
      await agent
        .post('/api/auth/login')
        .send({
          username: 'mfauser',
          password: 'Password123!'
        });

      // Verify MFA token to complete login
      await agent
        .post('/api/auth/verify-mfa')
        .send({
          token: '123456',
          sessionId: 'test-session-id'
        });

      // Now disable MFA
      const response = await agent
        .post('/api/auth/disable-mfa')
        .send({
          token: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('MFA disabled successfully');
    });
  });

  describe('Session Management', () => {
    it('should get active sessions', async () => {
      // Mock getUserSessions to return test sessions
      const getUserSessions = require('../../utils/session-manager').getUserSessions;
      getUserSessions.mockResolvedValueOnce([
        {
          sessionId: 'session1',
          userAgent: 'Chrome',
          ipAddress: '192.168.1.1',
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 3600000)
        },
        {
          sessionId: 'session2',
          userAgent: 'Firefox',
          ipAddress: '10.0.0.1',
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 3600000)
        }
      ]);

      // Login as regular user
      await agent
        .post('/api/auth/login')
        .send({
          username: 'regular',
          password: 'Password123!'
        });

      // Get sessions
      const response = await agent
        .get('/api/auth/sessions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].sessionId).toBe('session1');
    });

    it('should revoke a specific session', async () => {
      // Mock invalidateSession to return success
      const invalidateSession = require('../../utils/session-manager').invalidateSession;
      invalidateSession.mockResolvedValueOnce(true);

      // Login as regular user
      await agent
        .post('/api/auth/login')
        .send({
          username: 'regular',
          password: 'Password123!'
        });

      // Revoke session
      const response = await agent
        .post('/api/auth/revoke-session')
        .send({
          sessionId: 'session1'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Session revoked successfully');
    });

    it('should logout from all devices', async () => {
      // Mock invalidateUserSessions to return count
      const invalidateUserSessions = require('../../utils/session-manager').invalidateUserSessions;
      invalidateUserSessions.mockResolvedValueOnce(3);

      // Login as regular user
      await agent
        .post('/api/auth/login')
        .send({
          username: 'regular',
          password: 'Password123!'
        });

      // Logout from all devices
      const response = await agent
        .post('/api/auth/logout-all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out from all devices');
      expect(response.body.sessionCount).toBe(3);
    });
  });
});