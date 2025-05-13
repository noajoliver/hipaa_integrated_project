/**
 * Encryption Utility - Handles data encryption for PHI
 * @module utils/encryption
 */
const crypto = require('crypto');
const { logger } = require('./logger');

// Get encryption key from environment or generate one
// IMPORTANT: In production, this should be set as an environment variable
// and stored securely (e.g., in a key management service)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 
  crypto.randomBytes(32).toString('hex');

// Get encryption IV from environment or generate one
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || 
  crypto.randomBytes(16).toString('hex').slice(0, 16);

// Encryption algorithm - AES-256-GCM is recommended for PHI
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt data with AES-256-GCM
 * Complies with HIPAA requirements for PHI encryption
 * 
 * @param {string|Object} data - Data to encrypt
 * @returns {Object} - Encrypted data with auth tag and IV
 */
const encrypt = (data) => {
  try {
    // Convert data to string if it's an object
    const dataString = typeof data === 'object' 
      ? JSON.stringify(data) 
      : String(data);
    
    // Convert key from hex to buffer
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag (for GCM mode)
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return encrypted data with authentication tag and IV
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag,
      algorithm: ALGORITHM
    };
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data encrypted with AES-256-GCM
 * 
 * @param {Object} encryptedPackage - Encrypted data package
 * @param {string} encryptedPackage.encryptedData - Encrypted data hex string
 * @param {string} encryptedPackage.iv - Initialization vector hex string
 * @param {string} encryptedPackage.authTag - Authentication tag hex string
 * @param {string} encryptedPackage.algorithm - Encryption algorithm
 * @returns {string|Object} - Decrypted data
 */
const decrypt = (encryptedPackage) => {
  try {
    // Validate encrypted package
    if (!encryptedPackage || 
        !encryptedPackage.encryptedData || 
        !encryptedPackage.iv || 
        !encryptedPackage.authTag) {
      throw new Error('Invalid encrypted data package');
    }
    
    // Convert key from hex to buffer
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    // Convert IV from hex to buffer
    const iv = Buffer.from(encryptedPackage.iv, 'hex');
    
    // Convert auth tag from hex to buffer
    const authTag = Buffer.from(encryptedPackage.authTag, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Set auth tag
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    let decrypted = decipher.update(encryptedPackage.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Try to parse as JSON if possible
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      // Return as string if not valid JSON
      return decrypted;
    }
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Generate a secure random token
 * 
 * @param {number} length - Length of token in bytes
 * @returns {string} - Random token as hex string
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a secure hash of data
 * 
 * @param {string} data - Data to hash
 * @param {string} salt - Optional salt
 * @returns {string} - Hashed data
 */
const generateHash = (data, salt = null) => {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', useSalt)
    .update(data)
    .digest('hex');
    
  return {
    hash,
    salt: useSalt
  };
};

/**
 * Verify a hash against original data
 * 
 * @param {string} data - Original data
 * @param {string} hash - Hash to verify
 * @param {string} salt - Salt used for hashing
 * @returns {boolean} - Whether hash is valid
 */
const verifyHash = (data, hash, salt) => {
  const calculated = generateHash(data, salt);
  return crypto.timingSafeEqual(
    Buffer.from(calculated.hash),
    Buffer.from(hash)
  );
};

/**
 * Create a unique identifier for PHI that is consistent 
 * but doesn't expose the original data
 * 
 * @param {string} phi - PHI string to create identifier for
 * @param {string} context - Additional context for uniqueness
 * @returns {string} - Unique identifier
 */
const createPhiIdentifier = (phi, context = '') => {
  const hmac = crypto.createHmac('sha256', ENCRYPTION_KEY)
    .update(phi + context)
    .digest('hex');
    
  return hmac;
};

/**
 * Encrypt an entire object with sensitive PHI fields
 * 
 * @param {Object} data - Data object
 * @param {Array} phiFields - List of PHI field names to encrypt
 * @returns {Object} - Object with encrypted PHI fields
 */
const encryptPhiObject = (data, phiFields) => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const result = { ...data };
  
  for (const field of phiFields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encrypt(result[field]);
    }
  }
  
  return result;
};

/**
 * Decrypt an object with encrypted PHI fields
 * 
 * @param {Object} data - Data object with encrypted fields
 * @param {Array} phiFields - List of PHI field names to decrypt
 * @returns {Object} - Object with decrypted PHI fields
 */
const decryptPhiObject = (data, phiFields) => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const result = { ...data };
  
  for (const field of phiFields) {
    if (result[field] !== undefined && 
        result[field] !== null && 
        typeof result[field] === 'object' &&
        result[field].encryptedData) {
      try {
        result[field] = decrypt(result[field]);
      } catch (error) {
        logger.error(`Error decrypting field ${field}:`, error);
      }
    }
  }
  
  return result;
};

module.exports = {
  encrypt,
  decrypt,
  generateSecureToken,
  generateHash,
  verifyHash,
  createPhiIdentifier,
  encryptPhiObject,
  decryptPhiObject
};