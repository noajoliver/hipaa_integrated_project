/**
 * Global teardown for end-to-end tests
 */
const { disconnect } = require('../utils/test-db');

module.exports = async function() {
  console.log('\n=== Tearing Down E2E Test Environment ===');
  
  try {
    // Disconnect from test database
    await disconnect();
    
    console.log('Test database disconnected successfully');
  } catch (error) {
    console.error('Error tearing down test environment:', error);
    throw error;
  }
  
  // Small delay to allow all resources to be properly released
  await new Promise(resolve => setTimeout(resolve, 1000));
};