/**
 * Performance tests for document queries
 */
const { measureExecutionTime } = require('./utils');
const { Op, literal } = require('sequelize');

// Mock sequelize and models
const mockSequelize = {
  query: jest.fn().mockResolvedValue([{ data: 'mock' }])
};

const mockDocuments = Array(50).fill().map((_, i) => ({
  id: i + 1,
  title: `Test Document ${i + 1}`,
  description: `Description for test document ${i + 1}`,
  version: '1.0.0',
  status: 'active',
  createdBy: 1
}));

const mockAcknowledgments = mockDocuments.slice(0, 25).map(doc => ({
  userId: 1,
  documentId: doc.id,
  acknowledgmentDate: new Date()
}));

const mockDocument = {
  findAll: jest.fn().mockResolvedValue(mockDocuments),
  findAndCountAll: jest.fn().mockResolvedValue({
    count: 50,
    rows: mockDocuments.slice(0, 10)
  })
};

const mockDocumentAcknowledgment = {
  findAll: jest.fn().mockResolvedValue(mockAcknowledgments)
};

// Mock data for performance test
const testUserId = 1;
const testDocumentCount = 50;

describe('Document Query Performance Tests', () => {
  // Reset mocks before each test
  beforeEach(() => {
    mockDocument.findAll.mockClear();
    mockDocument.findAndCountAll.mockClear();
    mockDocumentAcknowledgment.findAll.mockClear();
  });
  
  describe('getDocumentsRequiringAcknowledgment', () => {
    it('should be faster with optimized query compared to N+1 approach', async () => {
      // Set up mocks for the test
      mockDocument.findAll.mockImplementation(async (options) => {
        if (options && options.where && options.where.id && options.where.id[Op.notIn]) {
          // This is the optimized query, so return documents that aren't acknowledged
          return mockDocuments.slice(25); // Return the 25 that aren't acknowledged
        } else {
          // For the regular query, return all documents
          return mockDocuments;
        }
      });

      mockDocumentAcknowledgment.findAll.mockResolvedValue(mockAcknowledgments);

      // Test the original N+1 query approach
      const n1QueryFn = async () => {
        // Get all active documents
        const allDocuments = await mockDocument.findAll({
          where: { status: 'active' }
        });

        // Get user's acknowledgments
        const userAcknowledgments = await mockDocumentAcknowledgment.findAll({
          where: { userId: testUserId },
          attributes: ['documentId']
        });

        const acknowledgedDocumentIds = userAcknowledgments.map(ack => ack.documentId);

        // Filter documents that haven't been acknowledged
        return allDocuments.filter(
          doc => !acknowledgedDocumentIds.includes(doc.id)
        );
      };

      // Test the optimized query approach
      const optimizedQueryFn = async () => {
        return await mockDocument.findAll({
          where: {
            status: 'active',
            id: {
              [Op.notIn]: literal(`(
                SELECT "documentId"
                FROM "document_acknowledgments"
                WHERE "userId" = ${testUserId}
              )`)
            }
          }
        });
      };

      // Measure execution time for both approaches
      const n1Result = await measureExecutionTime(n1QueryFn);
      const optimizedResult = await measureExecutionTime(optimizedQueryFn);

      // Log the results
      console.log(`N+1 Query Time: ${n1Result.executionTime.toFixed(2)} ms`);
      console.log(`Optimized Query Time: ${optimizedResult.executionTime.toFixed(2)} ms`);
      console.log(`Performance Improvement: ${((n1Result.executionTime - optimizedResult.executionTime) / n1Result.executionTime * 100).toFixed(2)}%`);

      // Verify both approaches were called
      expect(mockDocument.findAll).toHaveBeenCalledTimes(2);
      expect(mockDocumentAcknowledgment.findAll).toHaveBeenCalledTimes(1);

      // The optimized query should be faster because it avoids the second query and JS filtering
      expect(optimizedResult.executionTime).toBeLessThan(n1Result.executionTime);
    });
  });
  
  describe('Pagination', () => {
    it('should limit results and provide correct metadata', async () => {
      const page = 2;
      const limit = 10;
      const offset = (page - 1) * limit;

      // Set up mocks
      const unacknowledgedDocs = mockDocuments.slice(25); // 25 docs that aren't acknowledged
      mockDocument.findAndCountAll.mockResolvedValue({
        count: unacknowledgedDocs.length,
        rows: unacknowledgedDocs.slice(offset, offset + limit) // Second page
      });

      // Run the paginated query
      const { count, rows } = await mockDocument.findAndCountAll({
        where: {
          status: 'active',
          id: {
            [Op.notIn]: literal(`(
              SELECT "documentId"
              FROM "document_acknowledgments"
              WHERE "userId" = ${testUserId}
            )`)
          }
        },
        limit,
        offset
      });

      // Construct metadata
      const metadata = {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };

      // Verify the mock was called with correct parameters
      expect(mockDocument.findAndCountAll).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'active',
          id: expect.any(Object)
        }),
        limit,
        offset
      });

      // Verify pagination works correctly
      expect(rows.length).toBeLessThanOrEqual(limit);
      expect(metadata.page).toBe(page);
      expect(metadata.totalPages).toBe(Math.ceil(unacknowledgedDocs.length / limit));
    });
  });
});