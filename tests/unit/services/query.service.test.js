/**
 * Query Service Unit Tests
 * @module tests/unit/services/query-service
 */
const queryService = require('../../../services/query.service');
const cacheService = require('../../../services/cache.service');
const { sequelize } = require('../../../models');
const logger = require('../../../utils/logger');

// Mock dependencies
jest.mock('../../../models', () => {
  return {
    sequelize: {
      query: jest.fn(),
      QueryTypes: {
        SELECT: 'SELECT'
      }
    }
  };
});

jest.mock('../../../services/cache.service', () => ({
  get: jest.fn(),
  set: jest.fn()
}));

jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn()
}));

describe('Query Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('executeRawQuery', () => {
    it('should execute a SQL query with parameters', async () => {
      // Mock the sequelize query response
      sequelize.query.mockResolvedValueOnce([{ id: 1, name: 'Test' }]);
      
      const sql = 'SELECT * FROM users WHERE id = :id';
      const replacements = { id: 1 };
      
      const result = await queryService.executeRawQuery(sql, replacements);
      
      expect(sequelize.query).toHaveBeenCalledWith(sql, expect.objectContaining({
        replacements,
        type: 'SELECT'
      }));
      
      expect(result).toEqual([{ id: 1, name: 'Test' }]);
    });
    
    it('should log an error when query execution fails', async () => {
      // Mock the sequelize query to throw an error
      const error = new Error('Database error');
      sequelize.query.mockRejectedValueOnce(error);
      
      const sql = 'SELECT * FROM users WHERE id = :id';
      const replacements = { id: 1 };
      
      await expect(queryService.executeRawQuery(sql, replacements))
        .rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('executeWithCache', () => {
    it('should return cached result when available', async () => {
      // Mock cached response
      const cachedData = [{ id: 1, name: 'Test' }];
      cacheService.get.mockResolvedValueOnce(cachedData);
      
      const result = await queryService.executeWithCache(
        'test-key',
        'SELECT * FROM users',
        {},
        {},
        300
      );
      
      expect(cacheService.get).toHaveBeenCalledWith('test-key');
      expect(sequelize.query).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });
    
    it('should execute query and cache result on cache miss', async () => {
      // Mock cache miss then successful query
      cacheService.get.mockResolvedValueOnce(null);
      
      const queryResult = [{ id: 1, name: 'Test' }];
      sequelize.query.mockResolvedValueOnce(queryResult);
      
      const result = await queryService.executeWithCache(
        'test-key',
        'SELECT * FROM users',
        {},
        {},
        300
      );
      
      expect(cacheService.get).toHaveBeenCalledWith('test-key');
      expect(sequelize.query).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith('test-key', queryResult, 300);
      expect(result).toEqual(queryResult);
    });
  });
  
  describe('getDashboardStats', () => {
    it('should return cached dashboard stats when available', async () => {
      // Mock cached stats
      const cachedStats = {
        users: { total: 100, active: 80 },
        documents: { total: 50, active: 45 }
      };
      
      cacheService.get.mockResolvedValueOnce(cachedStats);
      
      const result = await queryService.getDashboardStats();
      
      expect(cacheService.get).toHaveBeenCalled();
      expect(sequelize.query).not.toHaveBeenCalled();
      expect(result).toEqual(cachedStats);
    });
    
    it('should execute queries and cache results on cache miss', async () => {
      // Mock cache miss then successful queries
      cacheService.get.mockResolvedValueOnce(null);
      
      // Mock query results for each stat query
      sequelize.query
        // Mock userStats
        .mockResolvedValueOnce([{ total: 100, active: 80 }])
        // Mock documentStats
        .mockResolvedValueOnce([{ total: 50, active: 45 }])
        // Mock trainingStats
        .mockResolvedValueOnce([{ total_courses: 20, total_assignments: 150 }])
        // Mock incidentStats
        .mockResolvedValueOnce([{ total: 30, critical: 5 }]);
      
      const result = await queryService.getDashboardStats();
      
      expect(cacheService.get).toHaveBeenCalled();
      expect(sequelize.query).toHaveBeenCalledTimes(4);
      expect(cacheService.set).toHaveBeenCalled();
      
      expect(result).toEqual({
        users: { total: 100, active: 80 },
        documents: { total: 50, active: 45 },
        training: { total_courses: 20, total_assignments: 150 },
        incidents: { total: 30, critical: 5 },
        timestamp: expect.any(Date)
      });
    });
    
    it('should apply filters to dashboard stats queries', async () => {
      // Mock cache miss then successful queries
      cacheService.get.mockResolvedValueOnce(null);
      
      // Mock all required query results
      sequelize.query
        .mockResolvedValueOnce([{ total: 100, active: 80 }])  // userStats
        .mockResolvedValueOnce([{ total: 50, active: 45 }])   // documentStats
        .mockResolvedValueOnce([{ total_courses: 20 }])       // trainingStats
        .mockResolvedValueOnce([{ total: 30, critical: 5 }]); // incidentStats
      
      const filters = {
        departmentId: 1,
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };
      
      await queryService.getDashboardStats(filters);
      
      // Check if all queries were called with the filters
      expect(sequelize.query).toHaveBeenCalledTimes(4);
      expect(sequelize.query.mock.calls[0][1].replacements).toEqual(
        expect.objectContaining({ departmentId: 1 })
      );
    });
  });
  
  describe('getUserComplianceReport', () => {
    it('should return cached compliance report when available', async () => {
      // Mock cached report
      const cachedReport = {
        data: [{ id: 1, username: 'user1', compliance_status: 'compliant' }],
        pagination: { page: 1, limit: 10, totalRecords: 1, totalPages: 1 }
      };
      
      cacheService.get.mockResolvedValueOnce(cachedReport);
      
      const result = await queryService.getUserComplianceReport();
      
      expect(cacheService.get).toHaveBeenCalled();
      expect(sequelize.query).not.toHaveBeenCalled();
      expect(result).toEqual(cachedReport);
    });
    
    it('should execute queries and cache results on cache miss', async () => {
      // Mock cache miss then successful queries
      cacheService.get.mockResolvedValueOnce(null);
      
      // Mock user list query result
      sequelize.query
        // Mock main query
        .mockResolvedValueOnce([
          { id: 1, username: 'user1', compliance_status: 'compliant' }
        ])
        // Mock count query 
        .mockResolvedValueOnce([{ total: 1 }]);
      
      const filters = { roleId: 2 };
      const pagination = { page: 1, limit: 10 };
      
      const result = await queryService.getUserComplianceReport(filters, pagination);
      
      expect(cacheService.get).toHaveBeenCalled();
      expect(sequelize.query).toHaveBeenCalledTimes(2);
      expect(cacheService.set).toHaveBeenCalled();
      
      expect(result).toEqual({
        data: [{ id: 1, username: 'user1', compliance_status: 'compliant' }],
        pagination: { page: 1, limit: 10, totalRecords: 1, totalPages: 1 },
        meta: { generatedAt: expect.any(Date), filters: { roleId: 2 } }
      });
    });
    
    it('should handle pagination correctly', async () => {
      // Mock cache miss then successful queries
      cacheService.get.mockResolvedValueOnce(null);
      
      // Mock query results 
      sequelize.query
        // Mock main query with pagination
        .mockResolvedValueOnce([
          { id: 11, username: 'user11' },
          { id: 12, username: 'user12' }
        ])
        // Mock count query
        .mockResolvedValueOnce([{ total: 25 }]);
      
      const pagination = { page: 2, limit: 10 };
      
      const result = await queryService.getUserComplianceReport({}, pagination);
      
      expect(sequelize.query.mock.calls[0][1].replacements).toEqual(
        expect.objectContaining({ limit: 10, offset: 10 })
      );
      
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        totalRecords: 25,
        totalPages: 3
      });
    });
  });
});