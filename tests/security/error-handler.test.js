/**
 * Tests for the error handler functionality
 */
const {
  AppError,
  handleError,
  asyncHandler,
  notFoundHandler,
  errorMiddleware
} = require('../../utils/error-handler');

describe('Error Handler Utilities', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const message = 'Test error message';
      const statusCode = 400;
      const errorCode = 'TEST_ERROR';
      
      const error = new AppError(message, statusCode, errorCode);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
      expect(error.errorCode).toBe(errorCode);
      expect(error.isOperational).toBe(true);
    });
    
    it('should default to INTERNAL_ERROR if no error code provided', () => {
      const error = new AppError('Test message', 500);
      expect(error.errorCode).toBe('INTERNAL_ERROR');
    });
    
    it('should capture stack trace', () => {
      const error = new AppError('Test message', 400);
      expect(error.stack).toBeDefined();
    });
  });
  
  describe('handleError', () => {
    let res;
    
    beforeEach(() => {
      // Mock response object
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });
    
    it('should handle AppError instances correctly', () => {
      const error = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
      
      handleError(error, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed'
      });
    });
    
    it('should handle JWT errors correctly', () => {
      const jwtError = new Error('invalid signature');
      jwtError.name = 'JsonWebTokenError';
      
      handleError(jwtError, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'INVALID_TOKEN',
        message: 'Invalid authentication token'
      });
    });
    
    it('should handle expired token errors correctly', () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      
      handleError(expiredError, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'EXPIRED_TOKEN',
        message: 'Authentication token has expired'
      });
    });
    
    it('should handle Sequelize validation errors correctly', () => {
      const sequelizeError = new Error('Validation error');
      sequelizeError.name = 'SequelizeValidationError';
      sequelizeError.errors = [
        { message: 'Username is required' },
        { message: 'Email must be valid' }
      ];
      
      handleError(sequelizeError, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation error',
        errors: ['Username is required', 'Email must be valid']
      });
    });
    
    it('should handle unknown errors correctly in production', () => {
      // Set environment to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const unknownError = new Error('Something went wrong');
      
      handleError(unknownError, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      });
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
    
    it('should include error details in development mode', () => {
      // Set environment to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const unknownError = new Error('Something went wrong');
      unknownError.stack = 'Error stack trace';
      
      handleError(unknownError, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        error: 'Something went wrong',
        stack: 'Error stack trace'
      });
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });
  
  describe('asyncHandler', () => {
    it('should pass through successful handler execution', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = asyncHandler(mockHandler);
      
      await wrappedHandler(req, res, next);
      
      expect(mockHandler).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should catch and pass errors to next', async () => {
      const req = {};
      const res = {};
      const next = jest.fn();
      const error = new Error('Test error');
      
      const mockHandler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = asyncHandler(mockHandler);
      
      await wrappedHandler(req, res, next);
      
      expect(mockHandler).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });
  
  describe('notFoundHandler', () => {
    it('should create a 404 error and pass to next', () => {
      const req = { originalUrl: '/test/path' };
      const res = {};
      const next = jest.fn();
      
      notFoundHandler(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: 'Resource not found - /test/path'
      }));
    });
  });
  
  describe('errorMiddleware', () => {
    it('should call handleError with error and response', () => {
      // Create a spy on handleError
      const handleErrorSpy = jest.spyOn(require('../../utils/error-handler'), 'handleError')
        .mockImplementation(() => {});
      
      const err = new Error('Test error');
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      
      errorMiddleware(err, req, res, next);
      
      expect(handleErrorSpy).toHaveBeenCalledWith(err, res);
      
      // Restore the original implementation
      handleErrorSpy.mockRestore();
    });
    
    it('should set default status code if not provided', () => {
      // Create a spy on handleError
      const handleErrorSpy = jest.spyOn(require('../../utils/error-handler'), 'handleError')
        .mockImplementation(() => {});
      
      const err = new Error('Test error');
      // No status code set
      
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      
      errorMiddleware(err, req, res, next);
      
      expect(err.statusCode).toBe(500);
      expect(handleErrorSpy).toHaveBeenCalledWith(err, res);
      
      // Restore the original implementation
      handleErrorSpy.mockRestore();
    });
  });
});