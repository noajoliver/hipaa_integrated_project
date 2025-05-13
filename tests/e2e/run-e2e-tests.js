/**
 * End-to-end test runner for HIPAA Compliance Tool
 * This script runs the comprehensive end-to-end tests and generates a detailed report
 */
const jest = require('jest');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'e2e';

// Output file path
const outputFilePath = path.join(__dirname, '../../test-results/e2e-test-report.json');

// Ensure test-results directory exists
const testResultsDir = path.join(__dirname, '../../test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

console.log('=== HIPAA Compliance Tool: End-to-End Tests ===');
console.log('Starting comprehensive end-to-end tests...');
console.log('This will verify all six phases of implementation.\n');

// Ensure the server is stopped after tests
process.on('exit', () => {
  console.log('\nCleaning up resources...');
  try {
    // This won't actually execute in the current process, but it's a reminder to do this manually
    console.log('Remember to stop any running server processes if started for tests.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

// Configure Jest options
const jestOptions = {
  projects: [__dirname], // Only run tests in the e2e directory
  json: true, // Output in JSON format
  outputFile: outputFilePath,
  testTimeout: 30000, // 30 seconds timeout for e2e tests
  detectOpenHandles: true, // Detect open handles (like database connections)
  forceExit: true, // Force exit after tests complete
  runInBand: true, // Run tests sequentially for e2e tests
  verbose: true, // Show detailed test output
};

// Run tests using Jest programmatically
jest.runCLI(jestOptions, [__dirname])
  .then(({ results }) => {
    // Display summary
    console.log('\n=== Test Results ===');
    console.log(`Total tests: ${results.numTotalTests}`);
    console.log(`Passed tests: ${results.numPassedTests}`);
    console.log(`Failed tests: ${results.numFailedTests}`);
    
    if (results.numFailedTests > 0) {
      console.log('\n❌ Some tests failed. See detailed report for more information.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed! The HIPAA Compliance Tool is fully functional.');
      
      // Generate a human-readable report
      generateHumanReadableReport(outputFilePath);
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Error running tests:', error);
    process.exit(1);
  });

/**
 * Generate a human-readable report from the Jest JSON output
 * @param {string} jsonFilePath - Path to the JSON output file
 */
function generateHumanReadableReport(jsonFilePath) {
  try {
    // Read the JSON report
    const report = require(jsonFilePath);
    
    // Create a markdown report
    const markdownReportPath = path.join(path.dirname(jsonFilePath), 'e2e-test-report.md');
    
    let markdown = '# HIPAA Compliance Tool: End-to-End Test Report\n\n';
    markdown += `**Date:** ${new Date().toISOString()}\n\n`;
    
    markdown += '## Summary\n\n';
    markdown += `- **Total Tests:** ${report.numTotalTests}\n`;
    markdown += `- **Passed Tests:** ${report.numPassedTests}\n`;
    markdown += `- **Failed Tests:** ${report.numFailedTests}\n`;
    markdown += `- **Duration:** ${Math.round(report.testResults.reduce((sum, result) => sum + result.perfStats.runtime, 0) / 1000)} seconds\n\n`;
    
    markdown += '## Test Suites\n\n';
    
    report.testResults.forEach((suite) => {
      const suiteName = path.basename(suite.name);
      const suiteStatus = suite.status === 'passed' ? '✅' : '❌';
      
      markdown += `### ${suiteStatus} ${suiteName}\n\n`;
      
      // Group test results by describe blocks
      const testsByGroup = {};
      
      suite.assertionResults.forEach((test) => {
        const testPath = test.ancestorTitles;
        const group = testPath.length > 0 ? testPath[0] : 'Ungrouped';
        
        if (!testsByGroup[group]) {
          testsByGroup[group] = [];
        }
        
        testsByGroup[group].push(test);
      });
      
      // Output tests by group
      Object.keys(testsByGroup).forEach((group) => {
        markdown += `#### ${group}\n\n`;
        
        testsByGroup[group].forEach((test) => {
          const testStatus = test.status === 'passed' ? '✅' : '❌';
          markdown += `- ${testStatus} ${test.title}\n`;
          
          if (test.failureMessages && test.failureMessages.length > 0) {
            markdown += '\n```\n';
            markdown += test.failureMessages.join('\n');
            markdown += '\n```\n\n';
          }
        });
        
        markdown += '\n';
      });
    });
    
    markdown += '## Conclusion\n\n';
    
    if (report.numFailedTests > 0) {
      markdown += '❌ Some tests failed. Please address the issues before proceeding.\n';
    } else {
      markdown += '✅ All tests passed! The HIPAA Compliance Tool is fully functional and meets all implementation requirements.\n';
    }
    
    // Write the markdown report
    fs.writeFileSync(markdownReportPath, markdown);
    
    console.log(`\nDetailed test report generated at: ${markdownReportPath}`);
  } catch (error) {
    console.error('Error generating human-readable report:', error);
  }
}