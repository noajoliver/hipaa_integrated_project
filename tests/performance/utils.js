/**
 * Performance testing utilities
 */
const db = require('../../models');
const { sequelize } = db;

/**
 * Measures execution time of a function
 * @param {Function} fn - The function to measure
 * @param {Array} args - Arguments to pass to the function
 * @returns {Object} - Result containing execution time and function result
 */
async function measureExecutionTime(fn, ...args) {
  const start = process.hrtime.bigint();
  const result = await fn(...args);
  const end = process.hrtime.bigint();
  
  // Convert to milliseconds
  const executionTime = Number(end - start) / 1000000;
  
  return {
    executionTime,
    result
  };
}

/**
 * Log query statistics for a given model
 * @param {string} modelName - Name of the model to check
 * @param {string} indexName - Name of the index to check (optional)
 * @returns {Object} - Information about the table and indexes
 */
async function logTableStats(modelName) {
  const model = db[modelName];
  
  if (!model) {
    throw new Error(`Model ${modelName} not found`);
  }
  
  const tableName = model.getTableName();
  
  // Get table statistics
  const tableStats = await sequelize.query(`
    SELECT
      schemaname,
      relname,
      n_live_tup as row_count,
      pg_size_pretty(pg_total_relation_size(relid)) as total_size,
      pg_size_pretty(pg_relation_size(relid)) as table_size,
      pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
    FROM pg_stat_user_tables
    WHERE relname = '${tableName}'
  `, { type: sequelize.QueryTypes.SELECT });
  
  // Get index statistics
  const indexStats = await sequelize.query(`
    SELECT
      indexrelname as index_name,
      idx_scan as scan_count,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched,
      pg_size_pretty(pg_relation_size(indexrelid)) as index_size
    FROM pg_stat_user_indexes
    WHERE relname = '${tableName}'
    ORDER BY idx_scan DESC
  `, { type: sequelize.QueryTypes.SELECT });
  
  return {
    modelName,
    tableStats,
    indexStats
  };
}

/**
 * Analyze a query and return the execution plan
 * @param {string} query - SQL query to analyze
 * @param {Object} replacements - Query parameters
 * @returns {Object} - Query execution plan
 */
async function explainQuery(query, replacements = {}) {
  const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
  const result = await sequelize.query(explainQuery, {
    replacements,
    type: sequelize.QueryTypes.SELECT
  });
  
  return result[0];
}

/**
 * Simulates database load by running multiple queries concurrently
 * @param {Function} queryFn - The query function to run
 * @param {number} concurrency - Number of concurrent executions
 * @returns {Object} - Statistics about the execution
 */
async function simulateLoad(queryFn, concurrency = 10) {
  const startTime = process.hrtime.bigint();
  
  // Create array of promises
  const promises = Array(concurrency).fill().map(() => queryFn());
  
  // Execute all promises
  const results = await Promise.all(promises);
  
  const endTime = process.hrtime.bigint();
  const totalTime = Number(endTime - startTime) / 1000000;
  
  // Calculate statistics
  const executionTimes = results.map(r => r.executionTime);
  const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / concurrency;
  const minTime = Math.min(...executionTimes);
  const maxTime = Math.max(...executionTimes);
  
  return {
    concurrency,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    results
  };
}

module.exports = {
  measureExecutionTime,
  logTableStats,
  explainQuery,
  simulateLoad
};