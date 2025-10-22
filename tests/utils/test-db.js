/**
 * Test database setup and utilities
 * @module tests/utils/test-db
 */
const { Sequelize } = require('sequelize');
const config = require('../../config/database')[process.env.NODE_ENV || 'test'];
const Factories = require('./factories');

// Create a test database connection
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port || 5432,
    dialect: config.dialect,
    logging: config.logging || false,
    pool: config.pool || {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

/**
 * Connect to the test database
 * @returns {Promise<Sequelize>} Sequelize instance
 */
const connect = async () => {
  try {
    await sequelize.authenticate();
    console.log('Test database connection has been established successfully.');
    return sequelize;
  } catch (error) {
    console.error('Unable to connect to the test database:', error);
    throw error;
  }
};

/**
 * Disconnect from the test database
 * @returns {Promise<void>}
 */
const disconnect = async () => {
  try {
    await sequelize.close();
    console.log('Test database connection has been closed successfully.');
  } catch (error) {
    console.error('Unable to close the test database connection:', error);
    throw error;
  }
};

/**
 * Synchronize test database and models
 * @param {Object} options - Sequelize sync options
 * @returns {Promise<void>}
 */
const sync = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('Test database synchronized successfully.');
  } catch (error) {
    console.error('Unable to synchronize the test database:', error);
    throw error;
  }
};

/**
 * Reset and seed the test database with test data using factories
 * @param {Object} options - Seeding options
 * @returns {Promise<Object>} Created test data
 */
const resetAndSeed = async (options = {}) => {
  try {
    // Reset the database
    await sequelize.sync({ force: true });

    console.log('Database reset, creating seed data...');

    // Use factories to create test data
    const seedData = {};

    // Create roles using factory
    seedData.adminRole = await Factories.getOrCreateRole('Admin');
    seedData.userRole = await Factories.getOrCreateRole('User');
    seedData.complianceOfficerRole = await Factories.getOrCreateRole('Compliance Officer');

    // Create departments
    seedData.itDepartment = await Factories.createDepartment({
      name: 'IT',
      description: 'Information Technology'
    });

    seedData.hrDepartment = await Factories.createDepartment({
      name: 'HR',
      description: 'Human Resources'
    });

    // Create users with specific credentials for consistent testing
    seedData.adminUser = await Factories.createAdmin({
      username: 'admin',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      departmentId: seedData.itDepartment.id
    });

    seedData.testUser = await Factories.createUser({
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      departmentId: seedData.hrDepartment.id
    });

    seedData.complianceOfficer = await Factories.createComplianceOfficer({
      username: 'compliance',
      email: 'compliance@example.com',
      firstName: 'Compliance',
      lastName: 'Officer',
      departmentId: seedData.itDepartment.id
    });

    // Optionally create additional test data
    if (options.createCourses) {
      seedData.courses = await Factories.createMultiple(Factories.createCourse, 3);
    }

    if (options.createDocuments) {
      seedData.documents = [];
      for (let i = 0; i < 3; i++) {
        const doc = await Factories.createDocument(seedData.adminUser.id);
        seedData.documents.push(doc);
      }
    }

    if (options.createIncidents) {
      seedData.incidents = [];
      for (let i = 0; i < 2; i++) {
        const incident = await Factories.createIncident(seedData.testUser.id);
        seedData.incidents.push(incident);
      }
    }

    console.log('Test database seeded successfully with factory data.');
    return seedData;
  } catch (error) {
    console.error('Unable to seed the test database:', error);
    throw error;
  }
};

/**
 * Clean up all test data
 * @returns {Promise<void>}
 */
const cleanup = async () => {
  try {
    await Factories.cleanup();
    console.log('Test data cleaned up successfully.');
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
};

/**
 * Execute a function within a database transaction
 * @param {Function} callback - Async function to execute within transaction
 * @returns {Promise<any>} Result of callback function
 */
const withTransaction = async (callback) => {
  const transaction = await sequelize.transaction();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Truncate all tables (faster than sync with force)
 * @returns {Promise<void>}
 */
const truncateAllTables = async () => {
  try {
    // Get all model names
    const models = Object.keys(sequelize.models);

    // Disable foreign key checks temporarily
    await sequelize.query('SET CONSTRAINTS ALL DEFERRED');

    // Truncate each table
    for (const modelName of models) {
      await sequelize.models[modelName].destroy({
        where: {},
        force: true,
        truncate: true
      });
    }

    console.log('All tables truncated successfully.');
  } catch (error) {
    console.error('Error truncating tables:', error);
    throw error;
  }
};

/**
 * Check if test database is accessible
 * @returns {Promise<boolean>}
 */
const isAccessible = async () => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  sequelize,
  connect,
  disconnect,
  sync,
  resetAndSeed,
  cleanup,
  withTransaction,
  truncateAllTables,
  isAccessible
};
