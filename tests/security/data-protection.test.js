/**
 * Unit tests for Data Protection Middleware
 */
const {
  encryptPhiMiddleware,
  decryptPhiMiddleware,
  protectPhi,
  maskSensitiveData
} = require('../../middleware/data-protection');
const { encrypt, decrypt } = require('../../utils/encryption');

// Mock dependencies
jest.mock('../../utils/encryption', () => ({
  encrypt: jest.fn(data => `encrypted_${data}`),
  decrypt: jest.fn(data => {
    if (data && typeof data === 'string' && data.startsWith('encrypted_')) {
      return data.substring(10);
    }
    return data;
  }),
  encryptPhiObject: jest.fn(),
  decryptPhiObject: jest.fn()
}));

describe('Data Protection Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      body: {
        name: 'John Doe',
        ssn: '123-45-6789',
        address: '123 Main St',
        medicalNotes: 'Patient has a history of...'
      },
      method: 'POST'
    };
    
    res = {
      locals: {},
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Create a mock response object with a .json method that intercepts the data
    res.json = jest.fn().mockImplementation(data => {
      res.locals.responseData = data;
      return res;
    });
    
    next = jest.fn().mockImplementation(() => {
      // If this function is called in a middleware chain, simulate the next middleware
      // by having it call res.json with the req.body data
      if (req.method === 'GET' && typeof res.locals.responseData === 'undefined') {
        res.json({
          success: true,
          data: req.body
        });
      }
    });
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('encryptPhiMiddleware', () => {
    it('should encrypt PHI fields on POST/PUT requests', () => {
      const middleware = encryptPhiMiddleware('patients', ['name', 'ssn', 'medicalNotes']);
      
      middleware(req, res, next);
      
      // Check that the PHI fields are encrypted
      expect(req.body.name).toBe('encrypted_John Doe');
      expect(req.body.ssn).toBe('encrypted_123-45-6789');
      expect(req.body.medicalNotes).toBe('encrypted_Patient has a history of...');
      
      // Check that non-PHI fields are unchanged
      expect(req.body.address).toBe('123 Main St');
      
      // Ensure next() was called
      expect(next).toHaveBeenCalled();
    });
    
    it('should not encrypt on GET requests', () => {
      req.method = 'GET';
      const middleware = encryptPhiMiddleware('patients', ['name', 'ssn']);
      
      middleware(req, res, next);
      
      // Check that no fields are encrypted
      expect(req.body.name).toBe('John Doe');
      expect(req.body.ssn).toBe('123-45-6789');
      
      // Ensure next() was called
      expect(next).toHaveBeenCalled();
    });
    
    it('should handle arrays of objects', () => {
      req.body = {
        patients: [
          { name: 'John Doe', ssn: '123-45-6789' },
          { name: 'Jane Smith', ssn: '987-65-4321' }
        ]
      };
      
      const middleware = encryptPhiMiddleware('patients', ['name', 'ssn']);
      
      middleware(req, res, next);
      
      // Check that PHI fields in arrays are encrypted
      expect(req.body.patients[0].name).toBe('encrypted_John Doe');
      expect(req.body.patients[0].ssn).toBe('encrypted_123-45-6789');
      expect(req.body.patients[1].name).toBe('encrypted_Jane Smith');
      expect(req.body.patients[1].ssn).toBe('encrypted_987-65-4321');
      
      // Ensure next() was called
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('decryptPhiMiddleware', () => {
    it('should decrypt PHI fields on GET responses', () => {
      req.method = 'GET';
      req.body = {
        name: 'encrypted_John Doe',
        ssn: 'encrypted_123-45-6789',
        address: '123 Main St'
      };
      
      const middleware = decryptPhiMiddleware('patients', ['name', 'ssn']);
      
      middleware(req, res, next);
      
      // At this point, next() has been called and the response has been set in res.locals.responseData
      
      // Check that PHI fields in the response are decrypted
      expect(res.locals.responseData.data.name).toBe('John Doe');
      expect(res.locals.responseData.data.ssn).toBe('123-45-6789');
      
      // Check that non-PHI fields are unchanged
      expect(res.locals.responseData.data.address).toBe('123 Main St');
    });
    
    it('should handle nested response objects', () => {
      req.method = 'GET';
      
      // Override next to simulate a complex response
      next = jest.fn().mockImplementation(() => {
        res.json({
          success: true,
          data: {
            id: 1,
            patient: {
              name: 'encrypted_John Doe',
              ssn: 'encrypted_123-45-6789'
            },
            visits: [
              { date: '2023-01-01', notes: 'encrypted_Regular checkup' },
              { date: '2023-02-15', notes: 'encrypted_Follow-up appointment' }
            ]
          }
        });
      });
      
      const middleware = decryptPhiMiddleware('patients', ['name', 'ssn', 'notes']);
      
      middleware(req, res, next);
      
      // Check that nested PHI fields are decrypted
      expect(res.locals.responseData.data.patient.name).toBe('John Doe');
      expect(res.locals.responseData.data.patient.ssn).toBe('123-45-6789');
      expect(res.locals.responseData.data.visits[0].notes).toBe('Regular checkup');
      expect(res.locals.responseData.data.visits[1].notes).toBe('Follow-up appointment');
    });
  });
  
  describe('protectPhi', () => {
    it('should return an array of encryption and decryption middlewares', () => {
      const middlewares = protectPhi('patients');
      
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares).toHaveLength(2);
      
      // Check that the middlewares are functions
      expect(typeof middlewares[0]).toBe('function');
      expect(typeof middlewares[1]).toBe('function');
    });
  });
  
  describe('maskSensitiveData', () => {
    it('should mask sensitive data in strings', () => {
      const result = maskSensitiveData('SSN: 123-45-6789, Credit Card: 4111-1111-1111-1111');
      
      expect(result).toContain('SSN: XXX-XX-XXXX');
      expect(result).toContain('Credit Card: XXXX-XXXX-XXXX-XXXX');
      expect(result).not.toContain('123-45-6789');
      expect(result).not.toContain('4111-1111-1111-1111');
    });
    
    it('should mask sensitive data in objects', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
        address: {
          street: '123 Main St',
          zip: '12345'
        }
      };
      
      const result = maskSensitiveData(data);
      
      expect(result.name).toBe('John Doe'); // Not masked
      expect(result.ssn).toBe('XXX-XX-XXXX');
      expect(result.creditCard).toBe('XXXX-XXXX-XXXX-XXXX');
      expect(result.address.street).toBe('123 Main St'); // Not masked
      expect(result.address.zip).toBe('12345'); // Not masked
    });
    
    it('should handle null and undefined values', () => {
      expect(maskSensitiveData(null)).toBeNull();
      expect(maskSensitiveData(undefined)).toBeUndefined();
    });
    
    it('should handle arrays', () => {
      const data = [
        { name: 'John Doe', ssn: '123-45-6789' },
        { name: 'Jane Smith', ssn: '987-65-4321' }
      ];
      
      const result = maskSensitiveData(data);
      
      expect(result[0].name).toBe('John Doe'); // Not masked
      expect(result[0].ssn).toBe('XXX-XX-XXXX');
      expect(result[1].name).toBe('Jane Smith'); // Not masked
      expect(result[1].ssn).toBe('XXX-XX-XXXX');
    });
  });
});