/**
 * API Response Utility Tests
 * @module tests/unit/utils/api-response
 */
const { 
  success, 
  error, 
  sendSuccess, 
  sendError, 
  sendPaginated 
} = require('../../../utils/api-response');

describe('API Response Utilities', () => {
  describe('success', () => {
    it('should create a success response object with default values', () => {
      const response = success();
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('message', 'Operation successful');
      expect(response).toHaveProperty('statusCode', 200);
      expect(response).toHaveProperty('data', null);
      expect(response).toHaveProperty('timestamp');
    });
    
    it('should create a success response object with custom values', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Custom success message';
      const statusCode = 201;
      
      const response = success(data, message, statusCode);
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('message', message);
      expect(response).toHaveProperty('statusCode', statusCode);
      expect(response).toHaveProperty('data', data);
      expect(response).toHaveProperty('timestamp');
    });
  });
  
  describe('error', () => {
    it('should create an error response object with default values', () => {
      const response = error();
      
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('message', 'Operation failed');
      expect(response).toHaveProperty('statusCode', 400);
      expect(response).toHaveProperty('errorCode', 'ERROR');
      expect(response).toHaveProperty('errors', null);
      expect(response).toHaveProperty('timestamp');
    });
    
    it('should create an error response object with custom values', () => {
      const message = 'Custom error message';
      const errorCode = 'CUSTOM_ERROR';
      const statusCode = 404;
      const errors = { field: 'Field error message' };
      
      const response = error(message, errorCode, statusCode, errors);
      
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('message', message);
      expect(response).toHaveProperty('statusCode', statusCode);
      expect(response).toHaveProperty('errorCode', errorCode);
      expect(response).toHaveProperty('errors', errors);
      expect(response).toHaveProperty('timestamp');
    });
  });
  
  describe('sendSuccess', () => {
    it('should send a success response with default values', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      sendSuccess(res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Operation successful',
        statusCode: 200,
        data: null,
        timestamp: expect.any(String)
      }));
    });
    
    it('should send a success response with custom values', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const data = { id: 1, name: 'Test' };
      const message = 'Custom success message';
      const statusCode = 201;
      
      sendSuccess(res, data, message, statusCode);
      
      expect(res.status).toHaveBeenCalledWith(statusCode);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message,
        statusCode,
        data,
        timestamp: expect.any(String)
      }));
    });
  });
  
  describe('sendError', () => {
    it('should send an error response with default values', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      sendError(res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Operation failed',
        statusCode: 400,
        errorCode: 'ERROR',
        errors: null,
        timestamp: expect.any(String)
      }));
    });
    
    it('should send an error response with custom values', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const message = 'Custom error message';
      const errorCode = 'CUSTOM_ERROR';
      const statusCode = 404;
      const errors = { field: 'Field error message' };
      
      sendError(res, message, errorCode, statusCode, errors);
      
      expect(res.status).toHaveBeenCalledWith(statusCode);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message,
        statusCode,
        errorCode,
        errors,
        timestamp: expect.any(String)
      }));
    });
  });
  
  describe('sendPaginated', () => {
    it('should send a paginated response', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const totalItems = 10;
      const page = 1;
      const limit = 3;
      
      sendPaginated(res, data, totalItems, page, limit);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Data retrieved successfully',
        statusCode: 200,
        data,
        pagination: {
          totalItems,
          totalPages: 4,
          currentPage: page,
          itemsPerPage: limit,
          hasNext: true,
          hasPrevious: false
        },
        timestamp: expect.any(String)
      }));
    });
    
    it('should calculate pagination correctly for middle page', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const data = [{ id: 4 }, { id: 5 }, { id: 6 }];
      const totalItems = 10;
      const page = 2;
      const limit = 3;
      
      sendPaginated(res, data, totalItems, page, limit);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        pagination: expect.objectContaining({
          totalItems,
          totalPages: 4,
          currentPage: page,
          itemsPerPage: limit,
          hasNext: true,
          hasPrevious: true
        })
      }));
    });
    
    it('should calculate pagination correctly for last page', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const data = [{ id: 10 }];
      const totalItems = 10;
      const page = 4;
      const limit = 3;
      
      sendPaginated(res, data, totalItems, page, limit);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        pagination: expect.objectContaining({
          totalItems,
          totalPages: 4,
          currentPage: page,
          itemsPerPage: limit,
          hasNext: false,
          hasPrevious: true
        })
      }));
    });
  });
});