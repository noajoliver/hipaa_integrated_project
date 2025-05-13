/**
 * Password Validator - HIPAA compliant password validation
 * @module utils/password-validator
 */

// CommonJS passwordValidator
const passwordValidator = require('password-validator');
const fs = require('fs');
const path = require('path');

// Create a schema
const passwordSchema = new passwordValidator();

// Add properties to the schema
passwordSchema
  .is().min(12)                                    // Minimum length 12
  .is().max(128)                                   // Maximum length 128
  .has().uppercase()                               // Must have uppercase letters
  .has().lowercase()                               // Must have lowercase letters
  .has().digits(1)                                 // Must have at least 1 digit
  .has().symbols(1)                                // Must have at least 1 symbol
  .has().not().spaces()                            // Should not have spaces
  .is().not().oneOf(['Password123!', 'Admin123!']); // Common passwords

// Load common passwords list if available
let commonPasswords = new Set();
try {
  const commonPasswordsFile = path.join(__dirname, '../config/common-passwords.txt');
  if (fs.existsSync(commonPasswordsFile)) {
    const data = fs.readFileSync(commonPasswordsFile, 'utf8');
    commonPasswords = new Set(data.split('\n').map(p => p.trim().toLowerCase()));
  }
} catch (error) {
  console.warn('Failed to load common passwords file:', error);
}

/**
 * Calculate similarity between two strings (Levenshtein distance)
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} Similarity as a percentage (0-100)
 */
const calculateSimilarity = (s1, s2) => {
  if (!s1 || !s2) return 0;
  
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  
  // Calculate Levenshtein distance
  const track = Array(s2.length + 1).fill(null).map(() => 
    Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i++) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= s2.length; j++) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  
  if (maxLength === 0) return 100;
  
  // Convert distance to similarity percentage
  return 100 * (1 - distance / maxLength);
};

/**
 * Check if password is too similar to personal info
 * @param {string} password - Password to check
 * @param {Object} personalInfo - Personal information
 * @returns {boolean} True if password is too similar to personal info
 */
const isTooSimilarToPersonalInfo = (password, personalInfo) => {
  if (!password || !personalInfo) return false;
  
  // Define similarity threshold (70% similar is too similar)
  const SIMILARITY_THRESHOLD = 70;
  
  // Check similarity with each piece of personal info
  for (const [key, value] of Object.entries(personalInfo)) {
    if (!value) continue;
    
    // Skip checking short values (less than 3 characters)
    if (value.length < 3) continue;
    
    const similarity = calculateSimilarity(password, value);
    if (similarity > SIMILARITY_THRESHOLD) {
      return true;
    }
    
    // Also check with reversed value (e.g., "smith" -> "htims")
    const reversedValue = value.split('').reverse().join('');
    const reversedSimilarity = calculateSimilarity(password, reversedValue);
    if (reversedSimilarity > SIMILARITY_THRESHOLD) {
      return true;
    }
  }
  
  return false;
};

/**
 * Validate password strength and compliance
 * @param {string} password - Password to validate
 * @param {Object} personalInfo - Personal information for comparison
 * @returns {Object} Validation result with isValid flag and message
 */
const validatePassword = (password, personalInfo = {}) => {
  // Check against password schema
  const schemaValidation = passwordSchema.validate(password, { list: true });
  
  if (schemaValidation.length > 0) {
    const errors = [];
    
    schemaValidation.forEach(rule => {
      switch (rule) {
        case 'min':
          errors.push('Password must be at least 12 characters long');
          break;
        case 'max':
          errors.push('Password must be at most 128 characters long');
          break;
        case 'uppercase':
          errors.push('Password must contain at least one uppercase letter');
          break;
        case 'lowercase':
          errors.push('Password must contain at least one lowercase letter');
          break;
        case 'digits':
          errors.push('Password must contain at least one digit');
          break;
        case 'symbols':
          errors.push('Password must contain at least one symbol');
          break;
        case 'spaces':
          errors.push('Password must not contain spaces');
          break;
        case 'oneOf':
          errors.push('Password is too common');
          break;
        default:
          errors.push(`Password fails validation rule: ${rule}`);
      }
    });
    
    return {
      isValid: false,
      message: errors.join('. ')
    };
  }
  
  // Check if password is in common passwords list
  if (commonPasswords.has(password.toLowerCase())) {
    return {
      isValid: false,
      message: 'Password is too common and may be easily guessed'
    };
  }
  
  // Check if password is too similar to personal info
  if (isTooSimilarToPersonalInfo(password, personalInfo)) {
    return {
      isValid: false,
      message: 'Password is too similar to personal information'
    };
  }
  
  // All validations passed
  return {
    isValid: true,
    message: 'Password meets all requirements'
  };
};

module.exports = {
  validatePassword,
  calculateSimilarity,
  isTooSimilarToPersonalInfo
};