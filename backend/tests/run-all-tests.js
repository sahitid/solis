/**
 * Master Test Runner
 * Runs all test suites and provides comprehensive report
 */

const runAuthTests = require('./test-auth');
const runEventTests = require('./test-events');
const runConflictTests = require('./test-conflicts');
const runRescheduleTests = require('./test-reschedule');

async function runAllTests() {
  console.log('\n');
  console.log('█'.repeat(70));
  console.log('█' + ' '.repeat(68) + '█');
  console.log('█' + '  SOLIS BACKEND - COMPREHENSIVE TEST SUITE'.padEnd(68) + '█');
  console.log('█' + ' '.repeat(68) + '█');
  console.log('█'.repeat(70));
  console.log('\n');

  const allResults = {
    totalTests: 0,
    totalPassed: 0,
    totalFailed: 0,
    suites: []
  };

  // Run Authentication Tests
  try {
    const authResults = await runAuthTests();
    allResults.suites.push({ name: 'Authentication & Preferences', ...authResults });
    allResults.totalTests += authResults.passed + authResults.failed;
    allResults.totalPassed += authResults.passed;
    allResults.totalFailed += authResults.failed;
  } catch (error) {
    console.error('Authentication test suite failed:', error.message);
    allResults.suites.push({ name: 'Authentication & Preferences', passed: 0, failed: 1, error: error.message });
    allResults.totalTests += 1;
    allResults.totalFailed += 1;
  }

  console.log('\n');

  // Run Event Tests
  try {
    const eventResults = await runEventTests();
    allResults.suites.push({ name: 'Event Creation & Management', ...eventResults });
    allResults.totalTests += eventResults.passed + eventResults.failed;
    allResults.totalPassed += eventResults.passed;
    allResults.totalFailed += eventResults.failed;
  } catch (error) {
    console.error('Event test suite failed:', error.message);
    allResults.suites.push({ name: 'Event Creation & Management', passed: 0, failed: 1, error: error.message });
    allResults.totalTests += 1;
    allResults.totalFailed += 1;
  }

  console.log('\n');

  // Run Conflict Tests
  try {
    const conflictResults = await runConflictTests();
    allResults.suites.push({ name: 'Conflict Detection', ...conflictResults });
    allResults.totalTests += conflictResults.passed + conflictResults.failed;
    allResults.totalPassed += conflictResults.passed;
    allResults.totalFailed += conflictResults.failed;
  } catch (error) {
    console.error('Conflict test suite failed:', error.message);
    allResults.suites.push({ name: 'Conflict Detection', passed: 0, failed: 1, error: error.message });
    allResults.totalTests += 1;
    allResults.totalFailed += 1;
  }

  console.log('\n');

  // Run Reschedule Tests
  try {
    const rescheduleResults = await runRescheduleTests();
    allResults.suites.push({ name: 'Event Rescheduling', ...rescheduleResults });
    allResults.totalTests += rescheduleResults.passed + rescheduleResults.failed;
    allResults.totalPassed += rescheduleResults.passed;
    allResults.totalFailed += rescheduleResults.failed;
  } catch (error) {
    console.error('Reschedule test suite failed:', error.message);
    allResults.suites.push({ name: 'Event Rescheduling', passed: 0, failed: 1, error: error.message });
    allResults.totalTests += 1;
    allResults.totalFailed += 1;
  }

  // Final Report
  console.log('\n');
  console.log('█'.repeat(70));
  console.log('█' + ' '.repeat(68) + '█');
  console.log('█' + '  FINAL TEST REPORT'.padEnd(68) + '█');
  console.log('█' + ' '.repeat(68) + '█');
  console.log('█'.repeat(70));
  console.log('\n');

  console.log('Test Suites Summary:');
  console.log('-'.repeat(70));
  allResults.suites.forEach((suite, i) => {
    const icon = suite.failed === 0 ? '✓' : '✗';
    const passRate = suite.passed + suite.failed > 0 
      ? ((suite.passed / (suite.passed + suite.failed)) * 100).toFixed(1)
      : '0.0';
    console.log(`${icon} ${suite.name}`);
    console.log(`   Tests: ${suite.passed + suite.failed} | Passed: ${suite.passed} | Failed: ${suite.failed} | Pass Rate: ${passRate}%`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('OVERALL STATISTICS');
  console.log('='.repeat(70));
  console.log(`Total Test Suites: ${allResults.suites.length}`);
  console.log(`Total Tests Run: ${allResults.totalTests}`);
  console.log(`Total Passed: ${allResults.totalPassed}`);
  console.log(`Total Failed: ${allResults.totalFailed}`);
  
  const overallPassRate = allResults.totalTests > 0
    ? ((allResults.totalPassed / allResults.totalTests) * 100).toFixed(1)
    : '0.0';
  console.log(`Overall Pass Rate: ${overallPassRate}%`);
  console.log('='.repeat(70));

  if (allResults.totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
  } else {
    console.log(`\n⚠ ${allResults.totalFailed} test(s) failed. Review errors above.\n`);
  }

  return allResults;
}

// Run if called directly
if (require.main === module) {
  runAllTests()
    .then((results) => {
      process.exit(results.totalFailed === 0 ? 0 : 1);
    })
    .catch(err => {
      console.error('Test suite crashed:', err);
      process.exit(1);
    });
}

module.exports = runAllTests;

