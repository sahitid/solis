/**
 * Authentication & Preferences Test Cases
 * Tests OAuth flow, user management, and preference handling
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:5000/api';

// Test data
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  workHours: {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
    saturday: { start: '', end: '' },
    sunday: { start: '', end: '' }
  },
  bedtime: {
    weekday: '22:00',
    weekend: '23:00'
  }
};

async function runAuthTests() {
  console.log('='.repeat(60));
  console.log('AUTHENTICATION & PREFERENCES TESTS');
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Health Check
  try {
    console.log('\n[TEST 1] Server Health Check');
    const response = await axios.get(`${API_BASE}/health`);
    console.log('✓ Status:', response.status);
    console.log('✓ Response:', response.data);
    results.passed++;
    results.tests.push({ name: 'Health Check', status: 'PASSED' });
  } catch (error) {
    console.log('✗ Error:', error.message);
    results.failed++;
    results.tests.push({ name: 'Health Check', status: 'FAILED', error: error.message });
  }

  // Test 2: Get OAuth URL
  try {
    console.log('\n[TEST 2] Get Google OAuth URL');
    const response = await axios.get(`${API_BASE}/auth/google`);
    console.log('✓ Status:', response.status);
    console.log('✓ Auth URL received:', response.data.authUrl ? 'Yes' : 'No');
    console.log('✓ URL starts with https://accounts.google.com:', 
      response.data.authUrl?.startsWith('https://accounts.google.com'));
    results.passed++;
    results.tests.push({ name: 'Get OAuth URL', status: 'PASSED' });
  } catch (error) {
    console.log('✗ Error:', error.message);
    results.failed++;
    results.tests.push({ name: 'Get OAuth URL', status: 'FAILED', error: error.message });
  }

  // Test 3: Check Auth Status (should be false initially)
  try {
    console.log('\n[TEST 3] Check Authentication Status (Unauthenticated)');
    const response = await axios.get(`${API_BASE}/auth/status`, {
      params: { email: testUser.email }
    });
    console.log('✓ Status:', response.status);
    console.log('✓ Authenticated:', response.data.authenticated);
    console.log('✓ Expected: false, Got:', response.data.authenticated);
    results.passed++;
    results.tests.push({ name: 'Check Auth Status', status: 'PASSED' });
  } catch (error) {
    console.log('✗ Error:', error.message);
    results.failed++;
    results.tests.push({ name: 'Check Auth Status', status: 'FAILED', error: error.message });
  }

  // Test 4: LLM Preference Assistance
  try {
    console.log('\n[TEST 4] LLM Preference Assistance');
    const response = await axios.post(`${API_BASE}/preferences/llm-assist`, {
      userMessage: "I work Monday to Friday, 9 AM to 5 PM. I usually go to bed around 10 PM on weekdays.",
      conversationHistory: []
    });
    console.log('✓ Status:', response.status);
    console.log('✓ Success:', response.data.success);
    console.log('✓ LLM Response:', response.data.message?.substring(0, 100) + '...');
    results.passed++;
    results.tests.push({ name: 'LLM Preference Assistance', status: 'PASSED' });
  } catch (error) {
    console.log('✗ Error:', error.message);
    if (error.response?.data) {
      console.log('✗ Response:', error.response.data);
    }
    results.failed++;
    results.tests.push({ name: 'LLM Preference Assistance', status: 'FAILED', error: error.message });
  }

  // Test 5: Parse Preferences from Natural Language
  try {
    console.log('\n[TEST 5] Parse Preferences from Natural Language');
    const response = await axios.post(`${API_BASE}/preferences/parse-preferences`, {
      userInput: "I work 9-5 Monday through Friday. My bedtime is 10 PM on weekdays and 11 PM on weekends. I prefer meetings between 2-4 PM. No meetings during lunch from 12-1 PM."
    });
    console.log('✓ Status:', response.status);
    console.log('✓ Success:', response.data.success);
    console.log('✓ Parsed Preferences:', JSON.stringify(response.data.preferences, null, 2));
    results.passed++;
    results.tests.push({ name: 'Parse Preferences', status: 'PASSED' });
  } catch (error) {
    console.log('✗ Error:', error.message);
    if (error.response?.data) {
      console.log('✗ Response:', error.response.data);
    }
    results.failed++;
    results.tests.push({ name: 'Parse Preferences', status: 'FAILED', error: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('AUTHENTICATION TESTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('\nTest Results:');
  results.tests.forEach((test, i) => {
    const icon = test.status === 'PASSED' ? '✓' : '✗';
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
  runAuthTests()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}

module.exports = runAuthTests;

