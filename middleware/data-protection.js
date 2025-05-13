/**
 * Data Protection Middleware
 * @module middleware/data-protection
 */
const { encrypt, decrypt, encryptPhiObject, decryptPhiObject } = require('../utils/encryption');
const { logger } = require('../utils/logger');

/**
 * PHI field definitions for different data types
 * Maps entity types to their PHI fields
 */
const PHI_FIELD_MAP = {
  patient: [
    'firstName', 'lastName', 'dateOfBirth', 'address', 'socialSecurityNumber',
    'phoneNumber', 'emailAddress', 'medicalRecordNumber'
  ],
  incident: [
    'affectedIndividuals', 'patientDetails', 'medicalInfo'
  ],
  document: [
    'patientIdentifiers', 'medicalDetails'
  ]
};

/**
 * Middleware to encrypt PHI fields in request body
 * @param {string} entityType - Entity type to determine PHI fields
 */
const encryptPhiMiddleware = (entityType) => {
  return (req, res, next) => {
    try {
      // Skip if no body or not an object
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }
      
      // Get PHI fields for entity type
      const phiFields = PHI_FIELD_MAP[entityType];
      
      // Skip if no PHI fields defined
      if (!phiFields || !phiFields.length) {
        return next();
      }
      
      // Encrypt PHI fields
      req.body = encryptPhiObject(req.body, phiFields);
      
      next();
    } catch (error) {
      logger.error(`Error encrypting PHI in ${entityType}:`, error);
      next(error);
    }
  };
};

/**
 * Middleware to decrypt PHI fields in response data
 * @param {string} entityType - Entity type to determine PHI fields
 */
const decryptPhiMiddleware = (entityType) => {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method
    res.json = function(data) {
      try {
        if (data && typeof data === 'object') {
          // Get PHI fields for entity type
          const phiFields = PHI_FIELD_MAP[entityType];
          
          // Skip if no PHI fields defined
          if (phiFields && phiFields.length) {
            // Check if response has data property (common pattern)
            if (data.data) {
              // Handle both array and single object
              if (Array.isArray(data.data)) {
                data.data = data.data.map(item => decryptPhiObject(item, phiFields));
              } else {
                data.data = decryptPhiObject(data.data, phiFields);
              }
            } else {
              // Try to decrypt the data object itself
              data = decryptPhiObject(data, phiFields);
            }
          }
        }
      } catch (error) {
        logger.error(`Error decrypting PHI in ${entityType}:`, error);
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Apply both encryption and decryption middleware
 * @param {string} entityType - Entity type to determine PHI fields
 */
const protectPhi = (entityType) => {
  return [
    encryptPhiMiddleware(entityType),
    decryptPhiMiddleware(entityType)
  ];
};

/**
 * Middleware to mask sensitive data in logs
 */
const maskSensitiveData = (req, res, next) => {
  // List of sensitive parameter names to mask
  const sensitiveParams = [
    'password', 'token', 'ssn', 'socialSecurity', 'dob', 'dateOfBirth',
    'creditCard', 'cardNumber', 'cvv', 'secret', 'mfaSecret'
  ];
  
  // Function to recursively mask sensitive data in object
  const maskData = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const masked = Array.isArray(obj) ? [...obj] : {...obj};
    
    for (const key in masked) {
      if (sensitiveParams.some(param => key.toLowerCase().includes(param.toLowerCase()))) {
        // Mask sensitive data
        masked[key] = typeof masked[key] === 'string' 
          ? '*'.repeat(Math.min(masked[key].length, 8)) 
          : '[REDACTED]';
      } else if (typeof masked[key] === 'object') {
        // Recursively mask nested objects
        masked[key] = maskData(masked[key]);
      }
    }
    
    return masked;
  };
  
  // Store original request body and query for logging
  if (req.body && typeof req.body === 'object') {
    req.originalBody = JSON.parse(JSON.stringify(req.body));
    req.loggableBody = maskData(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.originalQuery = JSON.parse(JSON.stringify(req.query));
    req.loggableQuery = maskData(req.query);
  }
  
  next();
};

module.exports = {
  encryptPhiMiddleware,
  decryptPhiMiddleware,
  protectPhi,
  maskSensitiveData
};