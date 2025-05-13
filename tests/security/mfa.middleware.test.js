/**
 * Unit tests for MFA Middleware
 */
const {
  checkMfaRequired,
  enforceMfa,
  verifyMfaToken,
  verifyBackupCode
} = require('../../middleware/mfa');
const securityService = require('../../services/security.service');
const { AppError } = require('../../utils/error-handler');

// Mock dependencies
jest.mock('../../services/security.service', () => ({
  verifyMFA: jest.fn(),
  useBackupCode: jest.fn()
}));

describe('MFA Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      user: {
        id: 1,
        username: 'testuser',
        mfaEnabled: false
      },
      body: {},
      path: '',
      session: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('checkMfaRequired', () => {
    it('should skip MFA check if user has no MFA enabled', async () => {
      await checkMfaRequired(req, res, next);
      
      expect(req.mfaRequired).toBe(false);
      expect(next).toHaveBeenCalled();
    });
    
    it('should require MFA if enabled but not verified', async () => {
      req.user.mfaEnabled = true;
      
      await checkMfaRequired(req, res, next);
      
      expect(req.mfaRequired).toBe(true);
      expect(next).toHaveBeenCalled();
    });
    
    it('should skip MFA check if already verified in session', async () => {
      req.user.mfaEnabled = true;
      req.session.mfaVerified = true;
      
      await checkMfaRequired(req, res, next);
      
      expect(req.mfaRequired).toBe(false);
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('enforceMfa', () => {
    it('should allow access if MFA is not required', async () => {
      req.mfaRequired = false;
      
      await enforceMfa(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should allow access to MFA verification endpoints', async () => {
      req.mfaRequired = true;
      req.path = '/api/auth/verify-mfa';
      
      await enforceMfa(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      // Reset and test backup code endpoint
      jest.clearAllMocks();
      req.path = '/api/auth/verify-backup-code';
      
      await enforceMfa(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should block access to other endpoints if MFA required', async () => {
      req.mfaRequired = true;
      req.path = '/api/users/profile';
      
      try {
        await enforceMfa(req, res, next);
        fail('should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
        expect(error.errorCode).toBe('MFA_REQUIRED');
      }
      
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('verifyMfaToken', () => {
    it('should verify valid MFA token', async () => {
      req.body.token = '123456';
      req.user.mfaEnabled = true;
      
      securityService.verifyMFA.mockReturnValue(true);
      
      await verifyMfaToken(req, res, next);
      
      expect(securityService.verifyMFA).toHaveBeenCalledWith(req.user, '123456');
      expect(req.session.mfaVerified).toBe(true);
      expect(next).toHaveBeenCalled();
    });
    
    it('should reject invalid MFA token', async () => {
      req.body.token = '123456';
      req.user.mfaEnabled = true;
      
      securityService.verifyMFA.mockReturnValue(false);
      
      try {
        await verifyMfaToken(req, res, next);
        fail('should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(401);
        expect(error.errorCode).toBe('INVALID_MFA_TOKEN');
      }
      
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should reject if MFA is not enabled', async () => {
      req.body.token = '123456';
      req.user.mfaEnabled = false;
      
      try {
        await verifyMfaToken(req, res, next);
        fail('should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.errorCode).toBe('MFA_NOT_ENABLED');
      }
      
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should reject if token is missing', async () => {
      req.user.mfaEnabled = true;
      
      try {
        await verifyMfaToken(req, res, next);
        fail('should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.errorCode).toBe('MFA_TOKEN_REQUIRED');
      }
      
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('verifyBackupCode', () => {
    it('should verify valid backup code', async () => {
      req.body.code = 'ABCD1234';
      req.user.mfaEnabled = true;
      
      securityService.useBackupCode.mockResolvedValue(true);
      
      await verifyBackupCode(req, res, next);
      
      expect(securityService.useBackupCode).toHaveBeenCalledWith(req.user, 'ABCD1234');
      expect(req.session.mfaVerified).toBe(true);
      expect(next).toHaveBeenCalled();
    });
    
    it('should reject invalid backup code', async () => {
      req.body.code = 'INVALID';
      req.user.mfaEnabled = true;
      
      securityService.useBackupCode.mockImplementation(() => {
        throw new AppError('Invalid backup code', 401, 'INVALID_BACKUP_CODE');
      });
      
      try {
        await verifyBackupCode(req, res, next);
        fail('should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.errorCode).toBe('INVALID_BACKUP_CODE');
      }
      
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should reject if MFA is not enabled', async () => {
      req.body.code = 'ABCD1234';
      req.user.mfaEnabled = false;
      
      try {
        await verifyBackupCode(req, res, next);
        fail('should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.errorCode).toBe('MFA_NOT_ENABLED');
      }
      
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should reject if code is missing', async () => {
      req.user.mfaEnabled = true;
      
      try {
        await verifyBackupCode(req, res, next);
        fail('should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.errorCode).toBe('BACKUP_CODE_REQUIRED');
      }
      
      expect(next).not.toHaveBeenCalled();
    });
  });
});