/**
 * Tests for the password validator functionality
 */
const {
  validatePassword,
  isCommonPassword,
  verifyNewPassword
} = require('../../utils/password-validator');

describe('Password Validator', () => {
  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const password = 'SecureP@ssw0rd';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should reject a password that is too short', () => {
      const password = 'Abc123!';  // 7 characters
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
    
    it('should reject a password without uppercase letters', () => {
      const password = 'secure123!';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });
    
    it('should reject a password without lowercase letters', () => {
      const password = 'SECURE123!';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });
    
    it('should reject a password without numbers', () => {
      const password = 'SecurePassword!';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });
    
    it('should reject a password without special characters', () => {
      const password = 'SecurePassword1';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
    
    it('should reject passwords with multiple issues', () => {
      const password = 'pass';  // too short, no uppercase, no special chars, no numbers
      const result = validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(4);  // short + no uppercase + no numbers + no special
    });
    
    it('should handle null/undefined passwords', () => {
      const result1 = validatePassword(null);
      expect(result1.isValid).toBe(false);
      
      const result2 = validatePassword(undefined);
      expect(result2.isValid).toBe(false);
      
      const result3 = validatePassword('');
      expect(result3.isValid).toBe(false);
    });
  });
  
  describe('isCommonPassword', () => {
    it('should identify common passwords', () => {
      expect(isCommonPassword('password')).toBe(true);
      expect(isCommonPassword('password123')).toBe(true);
      expect(isCommonPassword('admin123')).toBe(true);
      expect(isCommonPassword('letmein')).toBe(true);
    });
    
    it('should handle case variations of common passwords', () => {
      expect(isCommonPassword('Password')).toBe(true);
      expect(isCommonPassword('PASSWORD')).toBe(true);
      expect(isCommonPassword('Password123')).toBe(true);
    });
    
    it('should not identify strong unique passwords as common', () => {
      expect(isCommonPassword('hQ9$kLw2p!Zx5@vBn')).toBe(false);
      expect(isCommonPassword('SecureP@ssw0rd123')).toBe(false);
    });
  });
  
  describe('verifyNewPassword', () => {
    it('should accept a strong new password', () => {
      const newPassword = 'SecureP@ssw0rd123';
      const result = verifyNewPassword(newPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should reject common passwords', () => {
      const newPassword = 'password123';  // Using a password from our list
      const result = verifyNewPassword(newPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common and easily guessed');
    });
    
    it('should reject a new password that is too similar to the old one', () => {
      const oldPassword = 'SecureP@ssw0rd123';
      const newPassword = 'SecureP@ssw0rd124';  // Only last digit changed
      
      const result = verifyNewPassword(newPassword, oldPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('New password is too similar to your old password');
    });
    
    it('should accept a new password that is different from the old one', () => {
      const oldPassword = 'SecureP@ssw0rd123';
      const newPassword = 'TotallyD1fferent!';
      
      const result = verifyNewPassword(newPassword, oldPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should validate complexity requirements along with similarity check', () => {
      const oldPassword = 'SecureP@ssw0rd123';
      const newPassword = 'simple';  // Different but not complex enough
      
      const result = verifyNewPassword(newPassword, oldPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });
});