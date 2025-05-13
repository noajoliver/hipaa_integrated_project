/**
 * Test database setup and utilities
 * @module tests/utils/test-db
 */
const { Sequelize } = require('sequelize');
const config = require('../../config/database')[process.env.NODE_ENV || 'test'];

// Create a test database connection
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: false // Disable logging for tests
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
 * Reset and seed the test database with test data
 * @returns {Promise<void>}
 */
const resetAndSeed = async () => {
  try {
    // Reset the database
    await sequelize.sync({ force: true });
    
    // Import models
    const { User, Role, Department } = require('../../models');
    
    // Create test roles
    const adminRole = await Role.create({
      name: 'Admin',
      description: 'Administrator role',
      permissions: { isAdmin: true }
    });
    
    const userRole = await Role.create({
      name: 'User',
      description: 'Regular user role',
      permissions: {}
    });
    
    // Create test departments
    const itDepartment = await Department.create({
      name: 'IT',
      description: 'Information Technology'
    });
    
    const hrDepartment = await Department.create({
      name: 'HR',
      description: 'Human Resources'
    });
    
    // Create test users
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO', // password is 'Admin123!'
      firstName: 'Admin',
      lastName: 'User',
      position: 'Administrator',
      departmentId: itDepartment.id,
      roleId: adminRole.id,
      accountStatus: 'active'
    });
    
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO', // password is 'Admin123!'
      firstName: 'Test',
      lastName: 'User',
      position: 'Employee',
      departmentId: hrDepartment.id,
      roleId: userRole.id,
      accountStatus: 'active'
    });
    
    console.log('Test database seeded successfully.');
  } catch (error) {
    console.error('Unable to seed the test database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  connect,
  disconnect,
  sync,
  resetAndSeed
};