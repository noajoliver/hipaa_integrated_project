require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'hipaa_compliance_dev',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    // Only log SQL in development if explicitly enabled
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    // Add connection pool for development as well
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // Add query performance optimizations
    dialectOptions: {
      // Application name for database monitoring
      application_name: 'hipaa-compliance-dev'
    }
  },
  test: {
    username: process.env.TEST_DB_USERNAME || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    database: process.env.TEST_DB_NAME || 'hipaa_compliance_test',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5433,
    dialect: 'postgres',
    logging: false,
    // Smaller pool for tests
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      application_name: 'hipaa-compliance-test'
    }
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
    // Optimized connection pool settings for production
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      acquire: 60000, // 60 seconds to acquire connection
      idle: 10000 // 10 seconds before idle connection is released
    },
    // Performance optimizations
    dialectOptions: {
      // Application name for database monitoring
      application_name: 'hipaa-compliance-prod',
      // Connection SSL settings if needed
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false // Set to true in secure environments with proper certificates
      } : false,
      // Statement timeout to prevent long-running queries
      statement_timeout: 30000, // 30 seconds
      // Prepared statement cache size
      statement_cache_size: 100
    },
    // Benchmark queries taking longer than this threshold (ms)
    benchmark: process.env.DB_BENCHMARK === 'true' ? true : false
  }
};
