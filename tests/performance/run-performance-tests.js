/**
 * Performance Test Runner
 * 
 * This script runs all performance tests and generates a summary report.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const TESTS_DIR = path.join(__dirname);
const REPORT_FILE = path.join(__dirname, 'performance-report.md');
const TEST_FILES = [
  'index-performance.test.js',
  'pagination.test.js',
  'document-queries.test.js',
  'incident-queries.test.js'
];

// Function to format date
const formatDate = () => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

// Function to run a single test file
const runTestFile = (testFile) => {
  console.log(`Running performance test: ${testFile}`);
  try {
    const output = execSync(`npx jest ${path.join(TESTS_DIR, testFile)} --no-cache`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    return { file: testFile, success: true, output };
  } catch (error) {
    return { 
      file: testFile, 
      success: false, 
      output: error.stdout || error.message
    };
  }
};

// Function to parse test results from output
const parseTestResults = (output) => {
  const lines = output.split('\n');
  
  // Extract test times
  const testTimes = {};
  const testTimeRegex = /Test Suites:\s+(\d+)\s+passed,\s+(\d+)\s+total/;
  const timeRegex = /Time:\s+([0-9.]+)\s+s/;
  
  let timeMatch;
  let testMatch;
  
  for (const line of lines) {
    if (testMatch = testTimeRegex.exec(line)) {
      testTimes.passedSuites = parseInt(testMatch[1]);
      testTimes.totalSuites = parseInt(testMatch[2]);
    }
    
    if (timeMatch = timeRegex.exec(line)) {
      testTimes.executionTime = parseFloat(timeMatch[1]);
    }
  }
  
  // Try to extract performance metrics
  const metrics = [];
  
  // Look for lines with typical performance output
  // Example: "- With index: 12.34ms"
  const metricRegex = /-\s+([^:]+):\s+([0-9.]+)(ms|%)/;
  
  let currentTest = null;
  
  for (const line of lines) {
    // Look for test descriptions
    if (line.includes('Testing index performance:') || line.includes('Performance:')) {
      // Start a new test context
      currentTest = line.replace('Testing index performance:', '').replace('Performance:', '').trim();
      metrics.push({ test: currentTest, metrics: [] });
    } else if (currentTest && metricRegex.test(line)) {
      // Add metric to current test
      const match = metricRegex.exec(line);
      const metricName = match[1].trim();
      const metricValue = parseFloat(match[2]);
      const metricUnit = match[3];
      
      metrics[metrics.length - 1].metrics.push({
        name: metricName,
        value: metricValue,
        unit: metricUnit
      });
    }
  }
  
  return { testTimes, metrics };
};

// Function to generate a markdown report
const generateReport = (results) => {
  let report = `# Performance Test Report\n\n`;
  report += `Date: ${formatDate()}\n\n`;
  
  // Summary section
  report += `## Summary\n\n`;
  
  let totalTime = 0;
  let allTestsPassed = true;
  let totalTests = 0;
  
  results.forEach(result => {
    const { testTimes } = result.parsed;
    totalTime += testTimes.executionTime || 0;
    allTestsPassed = allTestsPassed && result.success;
    totalTests += testTimes.totalSuites || 0;
  });
  
  report += `- **Status**: ${allTestsPassed ? '✅ All tests passed' : '❌ Some tests failed'}\n`;
  report += `- **Total Test Files**: ${results.length}\n`;
  report += `- **Total Test Suites**: ${totalTests}\n`;
  report += `- **Total Execution Time**: ${totalTime.toFixed(2)}s\n\n`;
  
  // Detailed results
  report += `## Test Results\n\n`;
  
  results.forEach(result => {
    const { file, success, parsed } = result;
    
    report += `### ${file}\n\n`;
    report += `- **Status**: ${success ? '✅ Passed' : '❌ Failed'}\n`;
    
    if (parsed.testTimes) {
      report += `- **Execution Time**: ${parsed.testTimes.executionTime ? parsed.testTimes.executionTime.toFixed(2) + 's' : 'N/A'}\n`;
      report += `- **Test Suites**: ${parsed.testTimes.passedSuites || 0}/${parsed.testTimes.totalSuites || 0}\n`;
    }
    
    report += '\n';
    
    // Add performance metrics if available
    if (parsed.metrics && parsed.metrics.length > 0) {
      report += `#### Performance Metrics\n\n`;
      
      parsed.metrics.forEach(metric => {
        report += `##### ${metric.test}\n\n`;
        
        // Create a table for this test's metrics
        report += `| Metric | Value | Unit |\n`;
        report += `|--------|-------|------|\n`;
        
        metric.metrics.forEach(m => {
          report += `| ${m.name} | ${m.value.toFixed(2)} | ${m.unit} |\n`;
        });
        
        report += '\n';
      });
    }
  });
  
  // Recommendations section
  report += `## Recommendations\n\n`;
  
  // Add any performance improvement recommendations
  report += `Based on the test results, here are some recommendations:\n\n`;
  
  // Check which tests have good index performance
  const indexTests = results.find(r => r.file === 'index-performance.test.js');
  if (indexTests && indexTests.parsed.metrics) {
    const indexMetrics = indexTests.parsed.metrics;
    
    // Look for tests with significant improvement percentage
    const goodIndexes = [];
    const poorIndexes = [];
    
    indexMetrics.forEach(metric => {
      // Find the "Improvement" metric for this test
      const improvementMetric = metric.metrics.find(m => m.name === 'Improvement');
      
      if (improvementMetric) {
        if (improvementMetric.value >= 20) {
          goodIndexes.push(metric.test);
        } else if (improvementMetric.value < 5) {
          poorIndexes.push(metric.test);
        }
      }
    });
    
    if (goodIndexes.length > 0) {
      report += `- ✅ The following indexes are performing well and should be kept: ${goodIndexes.join(', ')}\n`;
    }
    
    if (poorIndexes.length > 0) {
      report += `- ⚠️ The following indexes may not be providing significant benefits: ${poorIndexes.join(', ')}\n`;
      report += `  - Consider reviewing these indexes and potentially removing them if they're not frequently used\n`;
    }
  }
  
  // General recommendations
  report += `- 📊 Regularly monitor query performance to identify any regressions\n`;
  report += `- 🔍 Use EXPLAIN ANALYZE on slow queries to further optimize them\n`;
  report += `- 🗄️ Consider adding more test data to better evaluate index performance\n`;
  
  return report;
};

// Main execution
console.log('Running performance tests...');

const testResults = TEST_FILES.map(file => {
  const result = runTestFile(file);
  result.parsed = parseTestResults(result.output);
  return result;
});

// Generate report
const report = generateReport(testResults);
fs.writeFileSync(REPORT_FILE, report);

console.log(`Performance test report generated: ${REPORT_FILE}`);

// Exit with appropriate code
const allPassed = testResults.every(r => r.success);
process.exit(allPassed ? 0 : 1);