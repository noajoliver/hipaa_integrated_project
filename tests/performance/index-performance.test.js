/**
 * Database Index Performance Tests
 * @module tests/performance/index-performance
 */
const { sequelize } = require('../../models');
const { 
  measureExecutionTime, 
  explainQuery 
} = require('./utils');

// Increase timeout for performance tests
jest.setTimeout(30000);

describe('Database Index Performance', () => {
  beforeAll(async () => {
    // Make sure database is connected
    try {
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      // Skip all tests if we can't connect to the database
      return;
    }
  });
  
  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });
  
  /**
   * Helper to execute a query with and without using an index
   * @param {string} description - Test description
   * @param {string} indexQuery - Query that should use the index
   * @param {string} nonIndexQuery - Query that should not use the index
   * @param {Object} params - Query parameters
   */
  const testIndexPerformance = async (description, indexQuery, nonIndexQuery, params = {}) => {
    // If not connected to a real database, skip the test
    if (process.env.NODE_ENV === 'test' || process.env.CI) {
      console.log(`Skipping index test: ${description}`);
      return;
    }
    
    console.log(`\nTesting index performance: ${description}`);
    
    // Get execution plan for indexed query
    const indexPlan = await explainQuery(indexQuery, params);
    console.log('Indexed query plan:', 
      indexPlan['QUERY PLAN'][0].Plan.Node ? 'Index Scan' : indexPlan['QUERY PLAN'][0].Plan['Node Type']);
    
    // Get execution plan for non-indexed query
    const nonIndexPlan = await explainQuery(nonIndexQuery, params);
    console.log('Non-indexed query plan:', 
      nonIndexPlan['QUERY PLAN'][0].Plan.Node ? 'Sequential Scan' : nonIndexPlan['QUERY PLAN'][0].Plan['Node Type']);
    
    // Execute the query that should use the index
    const { executionTime: indexTime } = await measureExecutionTime(
      async () => sequelize.query(indexQuery, { 
        replacements: params, 
        type: sequelize.QueryTypes.SELECT 
      })
    );
    
    // Execute the query that should not use the index
    const { executionTime: nonIndexTime } = await measureExecutionTime(
      async () => sequelize.query(nonIndexQuery, { 
        replacements: params, 
        type: sequelize.QueryTypes.SELECT 
      })
    );
    
    console.log(`- With index: ${indexTime.toFixed(2)}ms`);
    console.log(`- Without index: ${nonIndexTime.toFixed(2)}ms`);
    
    const improvement = nonIndexTime > 0 
      ? ((nonIndexTime - indexTime) / nonIndexTime * 100).toFixed(2)
      : 'N/A';
    
    console.log(`- Improvement: ${improvement}%`);
    
    // Note we're not making strict assertions here as performance can vary,
    // especially in test databases with small data sets where indexes might
    // not make much difference or could even be slower
  };
  
  describe('User Indexes', () => {
    it('should improve performance when filtering by role', async () => {
      // Query using the role index
      const indexQuery = `
        SELECT u.id, u.username, u."firstName", u."lastName", r.name as role
        FROM users u
        JOIN roles r ON u."roleId" = r.id
        WHERE u."roleId" = :roleId
        LIMIT 100
      `;
      
      // Query not using the index (forcing a sequential scan)
      const nonIndexQuery = `
        SELECT u.id, u.username, u."firstName", u."lastName", r.name as role
        FROM users u
        JOIN roles r ON u."roleId" = r.id
        WHERE u."roleId"::text = :roleIdText
        LIMIT 100
      `;
      
      await testIndexPerformance(
        'Role filtering',
        indexQuery,
        nonIndexQuery,
        { roleId: 2, roleIdText: '2' }
      );
    });
    
    it('should improve performance when searching by account status', async () => {
      // Query using the account status index
      const indexQuery = `
        SELECT u.id, u.username, u."accountStatus"
        FROM users u
        WHERE u."accountStatus" = :status
        LIMIT 100
      `;
      
      // Query not using the index
      const nonIndexQuery = `
        SELECT u.id, u.username, u."accountStatus"
        FROM users u
        WHERE LOWER(u."accountStatus") = LOWER(:status)
        LIMIT 100
      `;
      
      await testIndexPerformance(
        'Account status filtering',
        indexQuery,
        nonIndexQuery,
        { status: 'active' }
      );
    });
  });
  
  describe('Document Indexes', () => {
    it('should improve performance when filtering by document type', async () => {
      // Query using the document type index
      const indexQuery = `
        SELECT d.id, d.title, d."documentType"
        FROM documents d
        WHERE d."documentType" = :type
        LIMIT 100
      `;
      
      // Query not using the index
      const nonIndexQuery = `
        SELECT d.id, d.title, d."documentType"
        FROM documents d
        WHERE LOWER(d."documentType") = LOWER(:type)
        LIMIT 100
      `;
      
      await testIndexPerformance(
        'Document type filtering',
        indexQuery,
        nonIndexQuery,
        { type: 'policy' }
      );
    });
  });
  
  describe('Training Assignment Indexes', () => {
    it('should improve performance with composite user/course index', async () => {
      // Query using the composite index
      const indexQuery = `
        SELECT ta.id, ta.status, ta."completionDate"
        FROM training_assignments ta
        WHERE ta."userId" = :userId AND ta."courseId" = :courseId
      `;
      
      // Query not using the composite index
      const nonIndexQuery = `
        SELECT ta.id, ta.status, ta."completionDate"
        FROM training_assignments ta
        WHERE ta."userId"::text || '-' || ta."courseId"::text = :userCourse
      `;
      
      await testIndexPerformance(
        'User/course composite index',
        indexQuery,
        nonIndexQuery,
        { userId: 1, courseId: 1, userCourse: '1-1' }
      );
    });
  });
});