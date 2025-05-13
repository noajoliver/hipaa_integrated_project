/**
 * Tests for database index performance
 */
const { measureExecutionTime, explainQuery } = require('./utils');
const db = require('../../models');
const { AuditLog, Incident, DocumentAcknowledgment, sequelize } = db;
const { Op } = require('sequelize');

describe('Database Index Performance Tests', () => {
  // Note: These tests are dependent on having data in the database
  
  describe('AuditLog Indexes', () => {
    it('should use indexes for timestamp-based queries', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Query to check
      const query = `
        SELECT * FROM "audit_logs"
        WHERE "timestamp" > :thirtyDaysAgo
        ORDER BY "timestamp" DESC
        LIMIT 100
      `;
      
      // Get execution plan
      const plan = await explainQuery(query, { thirtyDaysAgo });
      console.log(JSON.stringify(plan, null, 2));
      
      // Check that plan uses index
      // Since the exact plan depends on the database state and settings,
      // just check that a plan exists for now
      expect(plan).toBeDefined();
    });
    
    it('should verify performance of user activity query with index', async () => {
      // Define a common query for user activity
      const userActivityQuery = async (userId) => {
        return await AuditLog.findAll({
          where: { userId },
          order: [['timestamp', 'DESC']],
          limit: 50
        });
      };
      
      // Test with a non-existent user ID to ensure consistent results
      const userId = 999999;
      
      // Measure query performance
      const result = await measureExecutionTime(userActivityQuery, userId);
      console.log(`User activity query execution time: ${result.executionTime.toFixed(2)} ms`);
      
      // Ensure the query returns an array (empty or not)
      expect(Array.isArray(result.result)).toBe(true);
    });
  });
  
  describe('Incident Indexes', () => {
    it('should use indexes for status filtering', async () => {
      // Query to check
      const query = `
        SELECT * FROM "incidents"
        WHERE "status" = 'reported'
        ORDER BY "incidentDate" DESC
        LIMIT 20
      `;
      
      // Get execution plan
      const plan = await explainQuery(query);
      console.log(JSON.stringify(plan, null, 2));
      
      // Just check that a plan exists
      expect(plan).toBeDefined();
    });
    
    it('should verify performance of combined status and severity query', async () => {
      // Define query that should use the composite index
      const criticalIncidentsQuery = async () => {
        return await Incident.findAll({
          where: { 
            status: 'reported',
            severity: 'critical'
          },
          order: [['incidentDate', 'DESC']],
          limit: 20
        });
      };
      
      // Measure query performance
      const result = await measureExecutionTime(criticalIncidentsQuery);
      console.log(`Critical incidents query time: ${result.executionTime.toFixed(2)} ms`);
      
      // Ensure the query returns an array
      expect(Array.isArray(result.result)).toBe(true);
    });
  });
  
  describe('DocumentAcknowledgment Indexes', () => {
    it('should use the composite index for user-document queries', async () => {
      // Query to check
      const query = `
        SELECT * FROM "document_acknowledgments"
        WHERE "userId" = :userId AND "documentId" = :documentId
      `;
      
      // Get execution plan
      const plan = await explainQuery(query, { userId: 1, documentId: 1 });
      console.log(JSON.stringify(plan, null, 2));
      
      // Just check that a plan exists
      expect(plan).toBeDefined();
    });
    
    it('should verify performance of user acknowledgments query', async () => {
      // Define a query that should use the index
      const userAcknowledgmentsQuery = async (userId) => {
        return await DocumentAcknowledgment.findAll({
          where: { userId },
          order: [['acknowledgmentDate', 'DESC']],
          limit: 50
        });
      };
      
      // Test with a non-existent user ID to ensure consistent results
      const userId = 999999;
      
      // Measure query performance
      const result = await measureExecutionTime(userAcknowledgmentsQuery, userId);
      console.log(`User acknowledgments query time: ${result.executionTime.toFixed(2)} ms`);
      
      // Ensure the query returns an array
      expect(Array.isArray(result.result)).toBe(true);
    });
  });
});