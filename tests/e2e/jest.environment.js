/**
 * Custom Jest environment setup for end-to-end tests
 * This ensures proper setup and teardown of resources
 */
const NodeEnvironment = require('jest-environment-node');
const { sequelize } = require('../utils/test-db');

class E2ETestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.testPath = context.testPath;
  }

  async setup() {
    // Call the parent setup
    await super.setup();
    
    console.log('Setting up E2E test environment');
    
    // Set up global variables or functions if needed
    this.global.TEST_ENV = 'e2e';
    
    // Add additional setup here if needed
  }

  async teardown() {
    // Custom teardown logic
    console.log('Tearing down E2E test environment');
    
    // Close any open connections or resources
    try {
      if (sequelize && sequelize.close) {
        await sequelize.close();
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
    
    // Call the parent teardown
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = E2ETestEnvironment;