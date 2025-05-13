/**
 * Global setup for end-to-end tests
 */
const { connect, resetAndSeed } = require('../utils/test-db');

module.exports = async function() {
  console.log('\n=== Setting up E2E Test Environment ===');
  
  // Set test mode environment variable
  process.env.NODE_ENV = 'test';
  process.env.TEST_MODE = 'e2e';
  
  try {
    // Connect to test database
    await connect();
    
    // Reset database and seed with test data
    await resetAndSeed();
    
    console.log('Test database connected and initialized successfully');
  } catch (error) {
    console.error('Error setting up test environment:', error);
    throw error;
  }
};