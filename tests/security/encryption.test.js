/**
 * Unit tests for Encryption Utility
 */
const { 
  encrypt, 
  decrypt, 
  encryptPhiObject, 
  decryptPhiObject,
  generateToken,
  hashData,
  verifyHash
} = require('../../utils/encryption');

describe('Encryption Utility', () => {
  const testData = 'sensitive patient data';
  const testObject = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    ssn: '123-45-6789',
    medicalRecords: 'Patient has a history of...',
    address: '123 Main St'
  };
  
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      // Encrypt the data
      const encrypted = encrypt(testData);
      
      // Verify the encrypted data is different from original
      expect(encrypted).not.toBe(testData);
      expect(typeof encrypted).toBe('string');
      
      // Decrypt the data
      const decrypted = decrypt(encrypted);
      
      // Verify the decrypted data matches the original
      expect(decrypted).toBe(testData);
    });
    
    it('should throw an error when decrypting invalid data', () => {
      expect(() => {
        decrypt('invalid-encrypted-data');
      }).toThrow();
    });
  });
  
  describe('encryptPhiObject and decryptPhiObject', () => {
    it('should selectively encrypt and decrypt fields in an object', () => {
      const phiFields = ['name', 'ssn', 'medicalRecords'];
      
      // Encrypt the object
      const encryptedObject = encryptPhiObject(testObject, phiFields);
      
      // Verify PHI fields are encrypted
      expect(encryptedObject.name).not.toBe(testObject.name);
      expect(encryptedObject.ssn).not.toBe(testObject.ssn);
      expect(encryptedObject.medicalRecords).not.toBe(testObject.medicalRecords);
      
      // Verify non-PHI fields are unchanged
      expect(encryptedObject.id).toBe(testObject.id);
      expect(encryptedObject.email).toBe(testObject.email);
      expect(encryptedObject.address).toBe(testObject.address);
      
      // Decrypt the object
      const decryptedObject = decryptPhiObject(encryptedObject, phiFields);
      
      // Verify all fields match original
      expect(decryptedObject).toEqual(testObject);
    });
    
    it('should handle empty or null fields', () => {
      const testObjectWithNull = {
        id: 1,
        name: null,
        ssn: '',
        notes: undefined,
        address: '123 Main St'
      };
      
      const phiFields = ['name', 'ssn', 'notes'];
      
      // Encrypt and decrypt should not throw errors
      const encryptedObject = encryptPhiObject(testObjectWithNull, phiFields);
      const decryptedObject = decryptPhiObject(encryptedObject, phiFields);
      
      // Verify handling of null/empty fields
      expect(decryptedObject.name).toBeNull();
      expect(decryptedObject.ssn).toBe('');
      expect(decryptedObject.notes).toBeUndefined();
    });
  });
  
  describe('generateToken', () => {
    it('should generate a random token of specified length', () => {
      const token1 = generateToken(16);
      const token2 = generateToken(16);
      
      // Verify tokens are strings of correct length
      expect(typeof token1).toBe('string');
      expect(token1.length).toBe(32); // 16 bytes = 32 hex chars
      
      // Verify tokens are different
      expect(token1).not.toBe(token2);
    });
    
    it('should default to 32 bytes if no length specified', () => {
      const token = generateToken();
      
      // 32 bytes = 64 hex chars
      expect(token.length).toBe(64);
    });
  });
  
  describe('hashData and verifyHash', () => {
    it('should hash data and verify it correctly', async () => {
      const data = 'password123';
      
      // Hash the data
      const hash = await hashData(data);
      
      // Verify hash is different from original
      expect(hash).not.toBe(data);
      
      // Verify the data against the hash
      const isValid = await verifyHash(data, hash);
      expect(isValid).toBe(true);
      
      // Verify incorrect data returns false
      const isInvalid = await verifyHash('wrongpassword', hash);
      expect(isInvalid).toBe(false);
    });
  });
});