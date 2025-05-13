/**
 * Performance tests for incident queries
 */
const { measureExecutionTime, simulateLoad } = require('./utils');
const db = require('../../models');
const { Incident, User, sequelize } = db;
const { Op } = require('sequelize');

// Mock data for performance test
const testUserId = 1;
const testIncidentCount = 30;

describe('Incident Query Performance Tests', () => {
  beforeAll(async () => {
    // Create test data - will be rolled back after tests
    await sequelize.transaction(async (t) => {
      // Create test user if not exists
      let testUser = await User.findByPk(testUserId, { transaction: t });
      
      if (!testUser) {
        testUser = await User.create({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password',
          firstName: 'Test',
          lastName: 'User',
          accountStatus: 'active'
        }, { transaction: t });
      }
      
      // Create test incidents with different statuses and severities
      const statuses = ['reported', 'under_investigation', 'remediated', 'closed'];
      const severities = ['low', 'medium', 'high', 'critical'];
      const categories = ['security', 'privacy', 'technical', 'operational'];
      
      const incidents = [];
      for (let i = 1; i <= testIncidentCount; i++) {
        const status = statuses[i % statuses.length];
        const severity = severities[i % severities.length];
        const category = categories[i % categories.length];
        const isBreachable = i % 5 === 0; // Every 5th incident is a potential breach
        
        // Set some incidents as closed with dates for average time calculation
        let incidentDate = new Date();
        incidentDate.setDate(incidentDate.getDate() - 30 - (i % 10)); // Random past date
        
        let closedDate = null;
        if (status === 'closed') {
          closedDate = new Date();
          closedDate.setDate(closedDate.getDate() - (i % 5)); // Random recent date
        }
        
        incidents.push({
          title: `Test Incident ${i}`,
          description: `Description for test incident ${i}`,
          incidentDate,
          reportedBy: testUser.id,
          reportedDate: new Date(),
          status,
          severity,
          category,
          isBreachable,
          closedDate,
          closedBy: status === 'closed' ? testUser.id : null
        });
      }
      
      await Incident.bulkCreate(incidents, { transaction: t });
    });
  });
  
  afterAll(async () => {
    // Cleanup test data
    await sequelize.transaction(async (t) => {
      await Incident.destroy({
        where: {
          title: { [Op.like]: 'Test Incident %' },
          reportedBy: testUserId
        },
        transaction: t
      });
    });
  });
  
  describe('getIncidentStatistics', () => {
    it('should be faster with optimized query compared to multiple separate queries', async () => {
      // Test the original approach with multiple separate queries
      const originalQueryFn = async () => {
        const baseExcludeFilter = { status: { [Op.ne]: 'archived' } };
        const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
        
        // Run queries sequentially
        // 1. Total incidents
        const totalIncidents = await Incident.count({
          where: baseExcludeFilter
        });
        
        // 2. Incidents by status
        const incidentsByStatus = await Incident.findAll({
          attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: baseExcludeFilter,
          group: ['status']
        });
        
        // 3. Incidents by severity
        const incidentsBySeverity = await Incident.findAll({
          attributes: [
            'severity',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: baseExcludeFilter,
          group: ['severity']
        });
        
        // 4. Incidents by category
        const incidentsByCategory = await Incident.findAll({
          attributes: [
            'category',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: baseExcludeFilter,
          group: ['category']
        });
        
        // 5. Open incidents
        const openIncidents = await Incident.count({
          where: {
            status: {
              [Op.notIn]: ['closed', 'archived']
            }
          }
        });
        
        // 6. Potential breaches
        const potentialBreaches = await Incident.count({
          where: {
            isBreachable: true,
            status: {
              [Op.ne]: 'archived'
            }
          }
        });
        
        // 7. Recent incidents
        const recentIncidents = await Incident.count({
          where: {
            incidentDate: {
              [Op.gt]: thirtyDaysAgo
            },
            status: {
              [Op.ne]: 'archived'
            }
          }
        });
        
        return {
          totalIncidents,
          incidentsByStatus,
          incidentsBySeverity,
          incidentsByCategory,
          openIncidents,
          potentialBreaches,
          recentIncidents
        };
      };
      
      // Test the optimized approach with parallel queries
      const optimizedQueryFn = async () => {
        // Use async/await with Promise.all to run multiple queries in parallel
        const baseExcludeFilter = { status: { [Op.ne]: 'archived' } };
        const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

        const [
          // 1. Get total incidents (non-archived)
          totalIncidents,
          
          // 2. Get incidents grouped by status, severity, and category in a single query
          incidentsGrouped,
          
          // 3. Get counts for other specific filters
          countStats
        ] = await Promise.all([
          // 1. Total incidents count
          Incident.count({
            where: baseExcludeFilter
          }),
          
          // 2. Perform aggregations for status, severity, and category
          sequelize.query(`
            SELECT 
              'status' as group_type, status as group_value, COUNT(*) as count
            FROM incidents
            WHERE status != 'archived'
            GROUP BY status
            
            UNION ALL
            
            SELECT 
              'severity' as group_type, severity as group_value, COUNT(*) as count
            FROM incidents
            WHERE status != 'archived'
            GROUP BY severity
            
            UNION ALL
            
            SELECT 
              'category' as group_type, category as group_value, COUNT(*) as count
            FROM incidents
            WHERE status != 'archived'
            GROUP BY category
          `, {
            type: sequelize.QueryTypes.SELECT
          }),
          
          // 3. Get all counts in a single query with conditional counting
          sequelize.query(`
            SELECT
              COUNT(CASE WHEN status NOT IN ('closed', 'archived') THEN 1 END) as open_incidents,
              COUNT(CASE WHEN "isBreachable" = true AND status != 'archived' THEN 1 END) as potential_breaches,
              COUNT(CASE WHEN "incidentDate" > :thirtyDaysAgo AND status != 'archived' THEN 1 END) as recent_incidents
            FROM incidents
          `, {
            replacements: { thirtyDaysAgo },
            type: sequelize.QueryTypes.SELECT
          })
        ]);
        
        // Format the grouped data
        const groupedResults = {
          status: {},
          severity: {},
          category: {}
        };
        
        incidentsGrouped.forEach(item => {
          const { group_type, group_value, count } = item;
          if (groupedResults[group_type]) {
            groupedResults[group_type][group_value] = parseInt(count);
          }
        });
        
        return {
          totalIncidents,
          incidentsGrouped: groupedResults,
          countStats: countStats[0]
        };
      };
      
      // Measure execution time for both approaches
      const originalResult = await measureExecutionTime(originalQueryFn);
      const optimizedResult = await measureExecutionTime(optimizedQueryFn);
      
      // Log the results
      console.log(`Original Queries Time: ${originalResult.executionTime.toFixed(2)} ms`);
      console.log(`Optimized Queries Time: ${optimizedResult.executionTime.toFixed(2)} ms`);
      console.log(`Performance Improvement: ${((originalResult.executionTime - optimizedResult.executionTime) / originalResult.executionTime * 100).toFixed(2)}%`);
      
      // The optimized query should be faster
      expect(optimizedResult.executionTime).toBeLessThan(originalResult.executionTime);
    });
    
    it('should handle multiple concurrent requests better with the optimized approach', async () => {
      // Test the original approach with multiple separate queries
      const originalQueryFn = async () => {
        return measureExecutionTime(async () => {
          const baseExcludeFilter = { status: { [Op.ne]: 'archived' } };
          
          // Run queries sequentially (simplified version)
          const totalIncidents = await Incident.count({
            where: baseExcludeFilter
          });
          
          const incidentsByStatus = await Incident.findAll({
            attributes: [
              'status',
              [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: baseExcludeFilter,
            group: ['status']
          });
          
          return { totalIncidents, incidentsByStatus };
        });
      };
      
      // Test the optimized approach with parallel queries
      const optimizedQueryFn = async () => {
        return measureExecutionTime(async () => {
          const baseExcludeFilter = { status: { [Op.ne]: 'archived' } };
          
          // Run queries in parallel
          const [totalIncidents, incidentsGrouped] = await Promise.all([
            Incident.count({
              where: baseExcludeFilter
            }),
            
            sequelize.query(`
              SELECT 
                'status' as group_type, status as group_value, COUNT(*) as count
              FROM incidents
              WHERE status != 'archived'
              GROUP BY status
            `, {
              type: sequelize.QueryTypes.SELECT
            })
          ]);
          
          return { totalIncidents, incidentsGrouped };
        });
      };
      
      // Simulate concurrent load
      const concurrency = 5;
      const originalLoad = await simulateLoad(originalQueryFn, concurrency);
      const optimizedLoad = await simulateLoad(optimizedQueryFn, concurrency);
      
      // Log the results
      console.log(`Original Approach Under Load (${concurrency} concurrent requests):`);
      console.log(`  Total Time: ${originalLoad.totalTime.toFixed(2)} ms`);
      console.log(`  Average Time: ${originalLoad.avgTime.toFixed(2)} ms`);
      console.log(`  Min/Max Time: ${originalLoad.minTime.toFixed(2)}/${originalLoad.maxTime.toFixed(2)} ms`);
      
      console.log(`Optimized Approach Under Load (${concurrency} concurrent requests):`);
      console.log(`  Total Time: ${optimizedLoad.totalTime.toFixed(2)} ms`);
      console.log(`  Average Time: ${optimizedLoad.avgTime.toFixed(2)} ms`);
      console.log(`  Min/Max Time: ${optimizedLoad.minTime.toFixed(2)}/${optimizedLoad.maxTime.toFixed(2)} ms`);
      
      // The optimized approach should handle concurrency better
      expect(optimizedLoad.totalTime).toBeLessThan(originalLoad.totalTime);
      expect(optimizedLoad.avgTime).toBeLessThan(originalLoad.avgTime);
    });
  });
});