/**
 * Tests for pagination middleware and implementation
 */
const paginationMiddleware = require('../../middleware/pagination');
const { Document } = require('../../models');

describe('Pagination Tests', () => {
  describe('Pagination Middleware', () => {
    it('should extract pagination parameters from query', () => {
      const req = {
        query: {
          page: '2',
          limit: '25',
          sortBy: 'title',
          sortDir: 'asc'
        }
      };
      const res = {};
      const next = jest.fn();
      
      paginationMiddleware(req, res, next);
      
      expect(req.pagination).toBeDefined();
      expect(req.pagination.page).toBe(2);
      expect(req.pagination.limit).toBe(25);
      expect(req.pagination.offset).toBe(25); // (page-1) * limit
      expect(req.pagination.sortField).toBe('title');
      expect(req.pagination.sortDirection).toBe('ASC');
      expect(next).toHaveBeenCalled();
    });
    
    it('should apply default values when parameters are missing', () => {
      const req = { query: {} };
      const res = {};
      const next = jest.fn();
      
      paginationMiddleware(req, res, next);
      
      expect(req.pagination).toBeDefined();
      expect(req.pagination.page).toBe(1);
      expect(req.pagination.limit).toBe(20);
      expect(req.pagination.offset).toBe(0);
      expect(req.pagination.sortField).toBe('createdAt');
      expect(req.pagination.sortDirection).toBe('DESC');
      expect(next).toHaveBeenCalled();
    });
    
    it('should enforce maximum limit', () => {
      const req = {
        query: {
          limit: '500' // More than max allowed
        }
      };
      const res = {};
      const next = jest.fn();
      
      paginationMiddleware(req, res, next);
      
      expect(req.pagination.limit).toBe(100); // Max limit enforced
      expect(next).toHaveBeenCalled();
    });
    
    it('should handle invalid parameters gracefully', () => {
      const req = {
        query: {
          page: 'invalid',
          limit: 'not-a-number'
        }
      };
      const res = {};
      const next = jest.fn();
      
      paginationMiddleware(req, res, next);
      
      expect(req.pagination).toBeDefined();
      expect(req.pagination.page).toBe(1); // Default applied
      expect(req.pagination.limit).toBe(20); // Default applied
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('Pagination Implementation in Controllers', () => {
    // Mock implementation similar to what would be in a controller
    const paginatedQuery = async (model, filter = {}, pagination) => {
      const { count, rows } = await model.findAndCountAll({
        where: filter,
        limit: pagination.limit,
        offset: pagination.offset,
        order: [[pagination.sortField, pagination.sortDirection]]
      });
      
      return {
        data: rows,
        meta: {
          total: count,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(count / pagination.limit)
        }
      };
    };
    
    it('should mock implementation of a controller with pagination', async () => {
      // Mock the Document model's findAndCountAll method
      Document.findAndCountAll = jest.fn().mockResolvedValue({
        count: 120, // Total records
        rows: Array(20).fill().map((_, i) => ({ id: i + 1, title: `Document ${i + 1}` }))
      });
      
      const pagination = {
        page: 2,
        limit: 20,
        offset: 20,
        sortField: 'createdAt',
        sortDirection: 'DESC'
      };
      
      const result = await paginatedQuery(Document, { status: 'active' }, pagination);
      
      // Check that the model was called with correct parameters
      expect(Document.findAndCountAll).toHaveBeenCalledWith({
        where: { status: 'active' },
        limit: 20,
        offset: 20,
        order: [['createdAt', 'DESC']]
      });
      
      // Check response format with metadata
      expect(result.data.length).toBe(20);
      expect(result.meta.total).toBe(120);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(6); // 120 / 20 = 6 pages
    });
    
    it('should handle last page with fewer items', async () => {
      // Mock the last page response
      Document.findAndCountAll = jest.fn().mockResolvedValue({
        count: 102, // Total records
        rows: Array(2).fill().map((_, i) => ({ id: i + 101, title: `Document ${i + 101}` }))
      });
      
      const pagination = {
        page: 6, // Last page
        limit: 20,
        offset: 100,
        sortField: 'createdAt',
        sortDirection: 'DESC'
      };
      
      const result = await paginatedQuery(Document, { status: 'active' }, pagination);
      
      // Check that the model was called with correct parameters
      expect(Document.findAndCountAll).toHaveBeenCalledWith({
        where: { status: 'active' },
        limit: 20,
        offset: 100,
        order: [['createdAt', 'DESC']]
      });
      
      // Check metadata for last page
      expect(result.data.length).toBe(2); // Only 2 items on last page
      expect(result.meta.total).toBe(102);
      expect(result.meta.page).toBe(6);
      expect(result.meta.totalPages).toBe(6); // 102 / 20 = 5.1 → 6 pages
    });
  });
});