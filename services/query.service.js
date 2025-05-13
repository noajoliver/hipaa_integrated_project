/**
 * Query Service - Optimized database queries for complex operations
 * @module services/query
 */
const { sequelize } = require('../models');
const cacheService = require('./cache.service');
const logger = require('../utils/logger');

/**
 * Execute raw SQL query with parameter binding
 * @param {string} sql - SQL query string with named parameters (:param)
 * @param {Object} replacements - Parameter values for SQL query
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Query results
 */
const executeRawQuery = async (sql, replacements = {}, options = {}) => {
  const defaultOptions = {
    type: sequelize.QueryTypes.SELECT,
    replacements,
    benchmark: true, // Log query timing
    logging: (query, timing) => {
      if (timing > 100) { // Log slow queries (over 100ms)
        logger.warn(`SLOW QUERY (${timing}ms): ${query}`);
      } else {
        logger.debug(`QUERY (${timing}ms): ${query}`);
      }
    }
  };
  
  const queryOptions = { ...defaultOptions, ...options };
  
  try {
    const results = await sequelize.query(sql, queryOptions);
    return results;
  } catch (error) {
    logger.error(`Query execution error: ${error.message}`, {
      sql,
      replacements,
      error
    });
    throw error;
  }
};

/**
 * Execute query with caching
 * @param {string} cacheKey - Cache key for storing results
 * @param {string} sql - SQL query string with named parameters (:param)
 * @param {Object} replacements - Parameter values for SQL query
 * @param {Object} options - Query options
 * @param {number} ttl - Cache time to live in seconds
 * @returns {Promise<Array>} Query results
 */
const executeWithCache = async (cacheKey, sql, replacements = {}, options = {}, ttl = 300) => {
  // Try to get from cache first
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    logger.debug(`Cache hit for key: ${cacheKey}`);
    return cached;
  }
  
  // Cache miss, execute query
  logger.debug(`Cache miss for key: ${cacheKey}`);
  const results = await executeRawQuery(sql, replacements, options);
  
  // Cache results
  await cacheService.set(cacheKey, results, ttl);
  
  return results;
};

/**
 * Get dashboard statistics for users, documents, training, and incidents
 * @param {Object} filters - Optional filters for the statistics
 * @returns {Promise<Object>} Dashboard statistics
 */
const getDashboardStats = async (filters = {}) => {
  const cacheKey = `dashboard:stats:${JSON.stringify(filters)}`;
  
  // Define SQL queries for each statistic
  const queries = {
    userStats: `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN "accountStatus" = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN "accountStatus" = 'inactive' THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN "accountStatus" = 'locked' THEN 1 ELSE 0 END) as locked,
        SUM(CASE WHEN "accountStatus" = 'pending' THEN 1 ELSE 0 END) as pending
      FROM users
      WHERE "deletedAt" IS NULL
      ${filters.departmentId ? 'AND "departmentId" = :departmentId' : ''}
    `,
    documentStats: `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived,
        COUNT(DISTINCT "categoryId") as categories
      FROM documents
      WHERE "deletedAt" IS NULL
      ${filters.hipaaCategory ? 'AND "hipaaCategory" = :hipaaCategory' : ''}
    `,
    trainingStats: `
      WITH assignment_stats AS (
        SELECT 
          a.status,
          COUNT(*) as count
        FROM training_assignments a
        JOIN users u ON a."userId" = u.id
        WHERE a."deletedAt" IS NULL
        ${filters.departmentId ? 'AND u."departmentId" = :departmentId' : ''}
        GROUP BY a.status
      )
      SELECT 
        (SELECT COUNT(*) FROM training_courses WHERE "deletedAt" IS NULL) as total_courses,
        (SELECT COUNT(*) FROM training_assignments WHERE "deletedAt" IS NULL 
         ${filters.departmentId ? 'AND "userId" IN (SELECT id FROM users WHERE "departmentId" = :departmentId)' : ''}) as total_assignments,
        COALESCE((SELECT count FROM assignment_stats WHERE status = 'assigned'), 0) as assigned,
        COALESCE((SELECT count FROM assignment_stats WHERE status = 'in_progress'), 0) as in_progress,
        COALESCE((SELECT count FROM assignment_stats WHERE status = 'completed'), 0) as completed,
        COALESCE((SELECT count FROM assignment_stats WHERE status = 'expired'), 0) as expired,
        COALESCE((SELECT count FROM assignment_stats WHERE status = 'failed'), 0) as failed
    `,
    incidentStats: `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'reported' THEN 1 ELSE 0 END) as reported,
        SUM(CASE WHEN status = 'under_investigation' THEN 1 ELSE 0 END) as under_investigation,
        SUM(CASE WHEN status = 'remediated' THEN 1 ELSE 0 END) as remediated,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN "isBreachable" = true THEN 1 ELSE 0 END) as breachable
      FROM incidents
      WHERE "deletedAt" IS NULL
      ${filters.startDate ? 'AND "incidentDate" >= :startDate' : ''}
      ${filters.endDate ? 'AND "incidentDate" <= :endDate' : ''}
    `
  };
  
  try {
    // Try to get from cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for dashboard stats`);
      return cached;
    }
    
    // Execute all queries in parallel
    const [userStats, documentStats, trainingStats, incidentStats] = await Promise.all([
      executeRawQuery(queries.userStats, filters),
      executeRawQuery(queries.documentStats, filters),
      executeRawQuery(queries.trainingStats, filters),
      executeRawQuery(queries.incidentStats, filters)
    ]);
    
    // Combine results
    const stats = {
      users: userStats[0],
      documents: documentStats[0],
      training: trainingStats[0],
      incidents: incidentStats[0],
      timestamp: new Date()
    };
    
    // Cache results for 5 minutes
    await cacheService.set(cacheKey, stats, 300);
    
    return stats;
  } catch (error) {
    logger.error(`Failed to get dashboard stats: ${error.message}`, { error });
    throw error;
  }
};

/**
 * Get user compliance report with training and document acknowledgment status
 * @param {Object} filters - Filters for the report
 * @param {Object} pagination - Pagination parameters
 * @returns {Promise<Object>} User compliance report
 */
const getUserComplianceReport = async (filters = {}, pagination = { page: 1, limit: 10 }) => {
  const offset = (pagination.page - 1) * pagination.limit;
  
  // Create a cache key based on filters and pagination
  const cacheKey = `reports:user-compliance:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`;
  
  // Define SQL query for user compliance report
  const sql = `
    WITH user_training AS (
      SELECT 
        u.id as user_id,
        COUNT(ta.id) as total_assignments,
        SUM(CASE WHEN ta.status = 'completed' THEN 1 ELSE 0 END) as completed_assignments,
        SUM(CASE WHEN ta.status = 'expired' OR (ta.status = 'assigned' AND ta."dueDate" < CURRENT_DATE) THEN 1 ELSE 0 END) as overdue_assignments
      FROM users u
      LEFT JOIN training_assignments ta ON u.id = ta."userId" AND ta."deletedAt" IS NULL
      WHERE u."deletedAt" IS NULL
      ${filters.departmentId ? 'AND u."departmentId" = :departmentId' : ''}
      ${filters.roleId ? 'AND u."roleId" = :roleId' : ''}
      ${filters.accountStatus ? 'AND u."accountStatus" = :accountStatus' : ''}
      GROUP BY u.id
    ),
    user_documents AS (
      SELECT 
        u.id as user_id,
        COUNT(d.id) as total_documents,
        SUM(CASE WHEN da.status = 'acknowledged' THEN 1 ELSE 0 END) as acknowledged_documents,
        SUM(CASE WHEN da.status IS NULL OR da.status = 'pending' THEN 1 ELSE 0 END) as unacknowledged_documents
      FROM users u
      CROSS JOIN (
        SELECT id FROM documents 
        WHERE status = 'active' AND "deletedAt" IS NULL
        ${filters.documentType ? 'AND "documentType" = :documentType' : ''}
        ${filters.hipaaCategory ? 'AND "hipaaCategory" = :hipaaCategory' : ''}
      ) d
      LEFT JOIN document_acknowledgments da ON u.id = da."userId" AND d.id = da."documentId" AND da."deletedAt" IS NULL
      WHERE u."deletedAt" IS NULL
      ${filters.departmentId ? 'AND u."departmentId" = :departmentId' : ''}
      ${filters.roleId ? 'AND u."roleId" = :roleId' : ''}
      ${filters.accountStatus ? 'AND u."accountStatus" = :accountStatus' : ''}
      GROUP BY u.id
    )
    SELECT 
      u.id,
      u.username,
      u.email,
      u."firstName",
      u."lastName",
      u.position,
      d.name as department,
      r.name as role,
      u."accountStatus",
      u."lastLogin",
      COALESCE(ut.total_assignments, 0) as total_training_assignments,
      COALESCE(ut.completed_assignments, 0) as completed_training_assignments,
      COALESCE(ut.overdue_assignments, 0) as overdue_training_assignments,
      CASE 
        WHEN COALESCE(ut.total_assignments, 0) = 0 THEN 0
        ELSE ROUND(COALESCE(ut.completed_assignments, 0) * 100.0 / NULLIF(ut.total_assignments, 0), 1)
      END as training_completion_percentage,
      COALESCE(ud.total_documents, 0) as total_documents,
      COALESCE(ud.acknowledged_documents, 0) as acknowledged_documents,
      COALESCE(ud.unacknowledged_documents, 0) as unacknowledged_documents,
      CASE 
        WHEN COALESCE(ud.total_documents, 0) = 0 THEN 0
        ELSE ROUND(COALESCE(ud.acknowledged_documents, 0) * 100.0 / NULLIF(ud.total_documents, 0), 1)
      END as document_acknowledgment_percentage,
      CASE 
        WHEN COALESCE(ut.overdue_assignments, 0) > 0 OR COALESCE(ud.unacknowledged_documents, 0) > 0 THEN 'non_compliant'
        WHEN COALESCE(ut.total_assignments, 0) = 0 AND COALESCE(ud.total_documents, 0) = 0 THEN 'not_applicable'
        ELSE 'compliant'
      END as compliance_status
    FROM users u
    LEFT JOIN user_training ut ON u.id = ut.user_id
    LEFT JOIN user_documents ud ON u.id = ud.user_id
    LEFT JOIN departments d ON u."departmentId" = d.id
    LEFT JOIN roles r ON u."roleId" = r.id
    WHERE u."deletedAt" IS NULL
    ${filters.departmentId ? 'AND u."departmentId" = :departmentId' : ''}
    ${filters.roleId ? 'AND u."roleId" = :roleId' : ''}
    ${filters.accountStatus ? 'AND u."accountStatus" = :accountStatus' : ''}
    ${filters.complianceStatus ? "AND (CASE WHEN COALESCE(ut.overdue_assignments, 0) > 0 OR COALESCE(ud.unacknowledged_documents, 0) > 0 THEN 'non_compliant' WHEN COALESCE(ut.total_assignments, 0) = 0 AND COALESCE(ud.total_documents, 0) = 0 THEN 'not_applicable' ELSE 'compliant' END) = :complianceStatus" : ''}
    ORDER BY u."lastName", u."firstName"
    LIMIT :limit OFFSET :offset
  `;
  
  // Count query to get total records (for pagination)
  const countSql = `
    SELECT COUNT(*) as total
    FROM users u
    WHERE u."deletedAt" IS NULL
    ${filters.departmentId ? 'AND u."departmentId" = :departmentId' : ''}
    ${filters.roleId ? 'AND u."roleId" = :roleId' : ''}
    ${filters.accountStatus ? 'AND u."accountStatus" = :accountStatus' : ''}
  `;
  
  try {
    // Try to get from cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for user compliance report`);
      return cached;
    }
    
    // Execute main query and count query in parallel
    const [users, countResult] = await Promise.all([
      executeRawQuery(sql, { ...filters, limit: pagination.limit, offset }),
      executeRawQuery(countSql, filters)
    ]);
    
    const totalRecords = parseInt(countResult[0].total, 10);
    const totalPages = Math.ceil(totalRecords / pagination.limit);
    
    // Format the report
    const report = {
      data: users,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalRecords,
        totalPages
      },
      meta: {
        generatedAt: new Date(),
        filters
      }
    };
    
    // Cache results for 5 minutes
    await cacheService.set(cacheKey, report, 300);
    
    return report;
  } catch (error) {
    logger.error(`Failed to get user compliance report: ${error.message}`, { error });
    throw error;
  }
};

module.exports = {
  executeRawQuery,
  executeWithCache,
  getDashboardStats,
  getUserComplianceReport
};