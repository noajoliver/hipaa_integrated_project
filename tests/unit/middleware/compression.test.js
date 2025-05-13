/**
 * Compression Middleware Unit Tests
 * @module tests/unit/middleware/compression
 */
const compressionMiddleware = require('../../../middleware/compression');

// Mock the compression module
jest.mock('compression', () => {
  return jest.fn(() => {
    return (req, res, next) => {
      res.setHeader('Content-Encoding', 'gzip');
      next();
    };
  });
});

describe('Compression Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should create compression middleware with correct options', () => {
    // Import the compression mock directly to check calls
    const compression = require('compression');
    
    // Initialize the middleware
    const middleware = compressionMiddleware();
    
    // Check if compression function was called
    expect(compression).toHaveBeenCalled();
    
    // Check if it was called with the expected options
    expect(compression).toHaveBeenCalledWith(expect.objectContaining({
      level: 6,
      threshold: 1024,
      filter: expect.any(Function)
    }));
  });
  
  it('should apply compression for text content', () => {
    // Get the filter function from the middleware
    const compression = require('compression');
    
    // Call the middleware to extract the filter function
    compressionMiddleware();
    
    // Get the filter function from the first call
    const { filter } = compression.mock.calls[0][0];
    
    // Create mock request and response
    const req = {
      headers: {
        'accept-encoding': 'gzip, deflate'
      }
    };
    
    const res = {
      getHeader: jest.fn().mockReturnValue('application/json')
    };
    
    // Check if filter function allows compression
    const shouldCompress = filter(req, res);
    expect(shouldCompress).toBe(true);
  });
  
  it('should skip compression for image content', () => {
    // Get the filter function from the middleware
    const compression = require('compression');
    
    // Call the middleware to extract the filter function
    compressionMiddleware();
    
    // Get the filter function from the first call
    const { filter } = compression.mock.calls[0][0];
    
    // Create mock request and response
    const req = {
      headers: {
        'accept-encoding': 'gzip, deflate'
      }
    };
    
    const res = {
      getHeader: jest.fn().mockReturnValue('image/jpeg')
    };
    
    // Check if filter function skips compression
    const shouldCompress = filter(req, res);
    expect(shouldCompress).toBe(false);
  });
  
  it('should not compress if client does not support gzip', () => {
    // Get the filter function from the middleware
    const compression = require('compression');
    
    // Call the middleware to extract the filter function
    compressionMiddleware();
    
    // Get the filter function from the first call
    const { filter } = compression.mock.calls[0][0];
    
    // Create mock request and response
    const req = {
      headers: {
        'accept-encoding': 'identity'
      }
    };
    
    const res = {
      getHeader: jest.fn().mockReturnValue('application/json')
    };
    
    // Check if filter function skips compression
    const shouldCompress = filter(req, res);
    expect(shouldCompress).toBe(false);
  });
  
  it('should apply compression correctly in a middleware chain', () => {
    // Create the middleware
    const middleware = compressionMiddleware();
    
    // Mock request and response
    const req = {};
    const res = {
      setHeader: jest.fn()
    };
    const next = jest.fn();
    
    // Call the middleware
    middleware(req, res, next);
    
    // Check if content-encoding header was set to gzip
    expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    
    // Check if next was called
    expect(next).toHaveBeenCalled();
  });
});