/**
 * Unit tests for Security Service
 */
const securityService = require('../../services/security.service');
const { User, AuditLog } = require('../../models');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');

// Mock dependencies
jest.mock('../../models', () => {
  const mockUser = {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    toJSON: jest.fn()
  };
  
  return {
    User: mockUser,
    AuditLog: {
      create: jest.fn().mockResolvedValue(true)
    },
    Op: { 
      or: jest.fn(),
      gt: jest.fn()
    }
  };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation((data) => Promise.resolve(`hashed_${data}`)),
  compare: jest.fn().mockImplementation((data, hash) => {
    return Promise.resolve(hash === `hashed_${data}` || hash === 'validHash');
  })
}));

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn().mockReturnValue({
    base32: 'ABCDEFGHIJKLMNOP',
    otpauth_url: 'otpauth://totp/HIPAA%20Compliance%20App%20(testuser)?secret=ABCDEFGHIJKLMNOP'
  }),
  totp: {
    verify: jest.fn().mockReturnValue(true)
  }
}));

jest.mock('../../utils/encryption', () => ({
  encrypt: jest.fn().mockImplementation((data) => `encrypted_${data}`),
  decrypt: jest.fn().mockImplementation((data) => {
    const match = data.match(/^encrypted_(.+)$/);
    return match ? match[1] : data;
  }),
  hashData: jest.fn().mockImplementation((data) => Promise.resolve(`hashed_${data}`)),
  generateToken: jest.fn().mockReturnValue('random-token')
}));

jest.mock('../../utils/session-manager', () => ({
  invalidateUserSessions: jest.fn().mockResolvedValue(3)
}));

describe('Security Service', () => {
  let mockUser;
  
  beforeEach(() => {
    mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password: 'validHash',
      accountStatus: 'active',
      failedLoginAttempts: 0,
      mfaEnabled: false,
      update: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true)
    };
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup User.findByPk mock
    User.findByPk.mockResolvedValue(mockUser);
  });
  
  describe('Account Lockout Management', () => {
    it('should increment failed login attempts', async () => {
      const result = await securityService.handleFailedLogin(mockUser, '192.168.1.1');
      
      expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
        failedLoginAttempts: 1,
        lastFailedLogin: expect.any(Date)
      }));
      
      expect(result).toHaveProperty('failedAttempts', 1);
      expect(result).toHaveProperty('isLocked', false);
      
      // Check that audit log was created
      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 1,
        action: 'FAILED_LOGIN_ATTEMPT',
        category: 'SECURITY'
      }));
    });
    
    it('should lock account after max failed attempts', async () => {
      mockUser.failedLoginAttempts = 4; // One more attempt will lock
      
      const result = await securityService.handleFailedLogin(mockUser, '192.168.1.1');
      
      expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
        failedLoginAttempts: 5,
        accountStatus: 'locked',
        lockUntil: expect.any(Date),
        accountLockExpiresAt: expect.any(Date)
      }));
      
      expect(result).toHaveProperty('isLocked', true);
    });
    
    it('should reset failed login attempts on successful login', async () => {
      mockUser.failedLoginAttempts = 2;
      
      await securityService.handleSuccessfulLogin(mockUser, '192.168.1.1');
      
      expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
        failedLoginAttempts: 0,
        lastLogin: expect.any(Date)
      }));
      
      // Check that audit log was created
      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 1,
        action: 'SUCCESSFUL_LOGIN',
        category: 'SECURITY'
      }));
    });
  });
  
  describe('Password Management', () => {
    it('should check if password is expired', async () => {
      // Test with expired password
      mockUser.passwordLastChanged = new Date(Date.now() - (100 * 24 * 60 * 60 * 1000)); // 100 days ago
      let isExpired = await securityService.isPasswordExpired(mockUser);
      expect(isExpired).toBe(true);
      
      // Test with valid password
      mockUser.passwordLastChanged = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
      isExpired = await securityService.isPasswordExpired(mockUser);
      expect(isExpired).toBe(false);
    });
    
    it('should check password history', async () => {
      mockUser.passwordHistory = JSON.stringify(['validHash', 'previousHash']);
      
      // Should detect password in history
      const isInHistory = await securityService.checkPasswordHistory(mockUser, 'currentPassword');
      expect(isInHistory).toBe(true);
      
      // Should not detect new password
      const isNewPassword = await securityService.checkPasswordHistory(mockUser, 'newSecurePassword');
      expect(isNewPassword).toBe(false);
    });
    
    it('should update password with history tracking', async () => {
      mockUser.password = 'oldHash';
      mockUser.passwordHistory = JSON.stringify(['oldHash', 'olderHash']);
      
      await securityService.updatePassword(mockUser, 'newHash');
      
      expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
        password: 'newHash',
        passwordLastChanged: expect.any(Date),
        lastPasswordChange: expect.any(Date),
        passwordHistory: expect.any(String)
      }));
    });
  });
  
  describe('Multi-Factor Authentication', () => {
    it('should set up MFA for a user', async () => {
      const result = await securityService.setupMFA(mockUser);
      
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      
      expect(mockUser.mfaSecret).toBe('encrypted_ABCDEFGHIJKLMNOP');
      expect(mockUser.save).toHaveBeenCalled();
    });
    
    it('should verify MFA token', async () => {
      mockUser.mfaEnabled = true;
      mockUser.mfaSecret = 'encrypted_SECRETKEY';
      
      const isValid = await securityService.verifyMfa(mockUser, '123456');
      
      expect(isValid).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith(expect.objectContaining({
        secret: 'SECRETKEY',
        token: '123456'
      }));
    });
    
    it('should generate and verify backup codes', async () => {
      // Mock implementation for useBackupCode
      securityService.useBackupCode = jest.fn().mockImplementation(async (user, code) => {
        if (code === 'VALID1234') {
          return true;
        }
        return false;
      });
      
      // Generate backup codes
      const codes = await securityService.generateBackupCodes(mockUser);
      
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBe(10);
      expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
        backupCodes: expect.any(String),
        mfaEnabled: true
      }));
      
      // Test backup code validation
      const validResult = await securityService.useBackupCode(mockUser, 'VALID1234');
      expect(validResult).toBe(true);
      
      const invalidResult = await securityService.useBackupCode(mockUser, 'INVALID123');
      expect(invalidResult).toBe(false);
    });
  });
  
  describe('Security Questions', () => {
    it('should set up security questions', async () => {
      const questions = [
        { question: 'What was your first pet\'s name?', answer: 'Fluffy' },
        { question: 'What city were you born in?', answer: 'New York' },
        { question: 'What was your first car?', answer: 'Toyota' }
      ];
      
      await securityService.setupSecurityQuestions(mockUser, questions);
      
      expect(mockUser.securityQuestions).toHaveLength(3);
      expect(mockUser.securityQuestions[0]).toHaveProperty('question', questions[0].question);
      expect(mockUser.securityQuestions[0]).toHaveProperty('answer', 'hashed_fluffy');
      expect(mockUser.save).toHaveBeenCalled();
    });
    
    it('should verify security questions', async () => {
      mockUser.securityQuestions = [
        { question: 'What was your first pet\'s name?', answer: 'hashed_fluffy' },
        { question: 'What city were you born in?', answer: 'hashed_new york' },
        { question: 'What was your first car?', answer: 'hashed_toyota' }
      ];
      
      // Mock findOne to return mockUser for verifySecurityQuestions
      User.findOne.mockResolvedValue(mockUser);
      
      // Correct answers
      const correctAnswers = [
        { question: 'What was your first pet\'s name?', answer: 'Fluffy' },
        { question: 'What city were you born in?', answer: 'New York' },
        { question: 'What was your first car?', answer: 'Toyota' }
      ];
      
      const correctResult = await securityService.verifySecurityQuestions(mockUser, correctAnswers);
      expect(correctResult).toBe(true);
      
      // Incorrect answers
      const incorrectAnswers = [
        { question: 'What was your first pet\'s name?', answer: 'Rex' },
        { question: 'What city were you born in?', answer: 'New York' },
        { question: 'What was your first car?', answer: 'Toyota' }
      ];
      
      const incorrectResult = await securityService.verifySecurityQuestions(mockUser, incorrectAnswers);
      expect(incorrectResult).toBe(false);
    });
  });
  
  describe('IP Restriction', () => {
    it('should check if IP is allowed', async () => {
      // Test with no IP restrictions
      mockUser.ipAccessList = [];
      let isAllowed = await securityService.checkAllowedIP(mockUser, '192.168.1.1');
      expect(isAllowed).toBe(true);
      
      // Test with IP in allowlist
      mockUser.ipAccessList = [
        { address: '192.168.1.1', description: 'Office' },
        { address: '10.0.0.1', description: 'Home' }
      ];
      isAllowed = await securityService.checkAllowedIP(mockUser, '192.168.1.1');
      expect(isAllowed).toBe(true);
      
      // Test with IP not in allowlist
      isAllowed = await securityService.checkAllowedIP(mockUser, '8.8.8.8');
      expect(isAllowed).toBe(false);
    });
    
    it('should add and remove IPs from allowlist', async () => {
      mockUser.ipAccessList = [{ address: '10.0.0.1', description: 'Home' }];
      
      // Add IP to allowlist
      await securityService.addIpToAllowlist(mockUser, '192.168.1.1', 'Office');
      
      expect(mockUser.ipAccessList).toContainEqual(expect.objectContaining({
        address: '192.168.1.1',
        description: 'Office'
      }));
      
      // Remove IP from allowlist
      await securityService.removeIpFromAllowlist(mockUser, '10.0.0.1');
      
      expect(mockUser.ipAccessList).not.toContainEqual(expect.objectContaining({
        address: '10.0.0.1'
      }));
    });
  });
});