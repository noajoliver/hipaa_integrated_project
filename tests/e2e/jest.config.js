/**
 * Jest configuration for end-to-end tests
 */
module.exports = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "../../coverage/e2e",

  // The test environment that will be used for testing
  testEnvironment: "./jest.environment.js",

  // The glob patterns Jest uses to detect test files
  testMatch: [
    "**/?(*.)+(spec|test).[tj]s?(x)"
  ],

  // A map from regular expressions to paths to transformers
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest"
  },

  // Timeout for each test (30 seconds for e2e tests)
  testTimeout: 30000,

  // Run tests in sequence rather than in parallel
  maxWorkers: 1,

  // Verbose output
  verbose: true,

  // Global setup/teardown
  globalSetup: "./setup.js",
  globalTeardown: "./teardown.js",
};