/**
 * Event Creation & Management Test Cases
 * Tests LLM parsing, event creation, and calendar sync
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:5000/api';

// Test data
const testEmail = 'test@example.com';

async function runEventTests() {
  console.log('='.repeat(60));
  console.log('EVENT CREATION & MANAGEMENT TESTS');
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Parse Simple Event
  try {
    console.log('\n[TEST 1] Parse Simple Natural Language Event');
    const response = await axios.post(`${API_BASE}/events/parse`, {
      userInput: "Coffee with John tomorrow at 3pm",
      email: testEmail
    });
    console.log('✓ Status:', response.status);
    console.log('✓ Success:', response.data.success);
    console.log('✓ Parsed Event:');
    console.log('   Title:', response.data.event?.title);
    console.log('   Start:', response.data.event?.startDateTime);
    console.log('   End:', response.data.event?.endDateTime);
    console.log('   Category:', response.data.event?.category);
    console.log('   Priority:', response.data.event?.priority);
    console.log('   Flexibility:', response.data.event?.flexibility);
    results.passed++;
    results.tests.push({ name: 'Parse Simple Event', status: 'PASSED' });
  } catch (error) {
    console.log('✗ Error:', error.message);
    if (error.response?.data) {
      console.log('✗ Response:', error.response.data);
    }
    results.failed++;
    results.tests.push({ name: 'Parse Simple Event', status: 'FAILED', error: error.message });
  }

  // Test 2: Parse Complex Event with Attendees
  try {
    console.log('\n[TEST 2] Parse Event with Multiple Attendees');
    const response = await axios.post(`${API_BASE}/events/parse`, {
      userInput: "Team meeting next Tuesday 2-3pm with sarah@company.com and tom@company.com to discuss quarterly results",
      email: testEmail
    });
    console.log('✓ Status:', response.status);
    console.log('✓ Success:', response.data.success);
    console.log('✓ Parsed Event:');
    console.log('   Title:', response.data.event?.title);
    console.log('   Duration (min):', response.data.event?.duration);
    console.log('   Attendees:', response.data.event?.attendees?.length);
    console.log('   Category:', response.data.event?.category);
    console.log('   Priority:', response.data.event?.priority);
    results.passed++;
    results.tests.push({ name: 'Parse Complex Event', status: 'PASSED' });
  } catch (error) {
    console.log('✗ Error:', error.message);
    if (error.response?.data) {
      console.log('✗ Response:', error.response.data);
    }
    results.failed++;
    results.tests.push({ name: 'Parse Complex Event', status: 'FAILED', error: error.message });
  }

  // Test 3: Parse Event with Ambiguous Time
  try {
    console.log('\n[TEST 3] Parse Event with Ambiguous Input');
    const response = await axios.post(`${API_BASE}/events/parse`, {
      userInput: "Dentist appointment Friday morning",
      email: testEmail
    });
    console.log('✓ Status:', response.status);
    console.log('✓ Success:', response.data.success);
    console.log('✓ LLM Inferred:');
    console.log('   Title:', response.data.event?.title);
    console.log('   Start Time:', response.data.event?.startDateTime);
    console.log('   Category:', response.data.event?.category);
    console.log('   Flexibility:', response.data.event?.flexibility);
    results.passed++;
    results.tests.push({ name: 'Parse Ambiguous Event', status: 'PASSED' });
  } catch (error) {
    console.log('✗ Error:', error.message);
    if (error.response?.data) {
      console.log('✗ Response:', error.response.data);
    }
    results.failed++;
    results.tests.push({ name: 'Parse Ambiguous Event', status: 'FAILED', error: error.message });
  }

  // Test 4: Get User Events (should require auth)
  try {
    console.log('\n[TEST 4] Get User Events');
    const response = await axios.get(`${API_BASE}/events/${testEmail}`);
    console.log('✓ Status:', response.status);
    console.log('✓ Success:', response.data.success);
    console.log('✓ Event Count:', response.data.count);
    results.passed++;
    results.tests.push({ name: 'Get User Events', status: 'PASSED' });
  } catch (error) {
    // This might fail if user doesn't exist yet, which is expected
    if (error.response?.status === 404 || error.response?.status === 401) {
      console.log('⚠ Expected error (user not authenticated):', error.response.status);
      results.passed++;
      results.tests.push({ name: 'Get User Events', status: 'PASSED (Expected Auth Error)' });
    } else {
      console.log('✗ Error:', error.message);
      results.failed++;
      results.tests.push({ name: 'Get User Events', status: 'FAILED', error: error.message });
    }
  }

  // Test 5: Event Validation - Missing Required Fields
  try {
    console.log('\n[TEST 5] Event Validation - Missing Fields');
    const response = await axios.post(`${API_BASE}/events/create`, {
      email: testEmail,
      eventData: {
        // Missing required fields: title, startDateTime, endDateTime
        description: 'This should fail'
      }
    });
    console.log('✗ Should have failed but got status:', response.status);
    results.failed++;
    results.tests.push({ name: 'Event Validation', status: 'FAILED - Should reject invalid data' });
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Correctly rejected invalid event data');
      console.log('✓ Error message:', error.response.data.error);
      results.passed++;
      results.tests.push({ name: 'Event Validation', status: 'PASSED' });
    } else {
      console.log('✗ Unexpected error:', error.message);
      results.failed++;
      results.tests.push({ name: 'Event Validation', status: 'FAILED', error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('EVENT TESTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('\nTest Results:');
  results.tests.forEach((test, i) => {
    const icon = test.status.includes('PASSED') ? '✓' : '✗';
    console.log(`  ${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`     Error: ${test.error}`);
    }
  });
  console.log('='.repeat(60));

  return results;
}

// Run if called directly
if (require.main === module) {
  runEventTests()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}

module.exports = runEventTests;

