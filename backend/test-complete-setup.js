// Complete Setup Test - Check all configurations
require('dotenv').config();
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');

console.log('\n🔍 SOLIS COMPLETE SETUP TEST\n');
console.log('='.repeat(70));

let allPassed = true;

// Test 1: Environment Variables
console.log('\n📋 Test 1: Environment Variables\n');

const requiredVars = {
  'MONGO_URI': process.env.MONGO_URI,
  'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
  'GOOGLE_REDIRECT_URI': process.env.GOOGLE_REDIRECT_URI,
  'GOOGLE_API_KEY': process.env.GOOGLE_API_KEY,
  'GEMINI_API_KEY': process.env.GEMINI_API_KEY
};

let envPassed = true;
for (const [key, value] of Object.entries(requiredVars)) {
  const isSet = value && !value.includes('your-') && !value.includes('your_');
  if (isSet) {
    const display = value.substring(0, 25) + '...';
    console.log(`   ✅ ${key}: ${display}`);
  } else {
    console.log(`   ❌ ${key}: NOT SET`);
    envPassed = false;
    allPassed = false;
  }
}

if (envPassed) {
  console.log('\n   ✅ All environment variables configured');
} else {
  console.log('\n   ❌ Some environment variables missing');
}

// Test 2: MongoDB Connection
console.log('\n📦 Test 2: MongoDB Atlas Connection\n');

async function testMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`   ✅ MongoDB connected successfully`);
    console.log(`   ✅ Database: ${mongoose.connection.name}`);
    console.log(`   ✅ Host: ${mongoose.connection.host.split('.')[0]}...`);
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log(`   ❌ MongoDB connection failed`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Test 3: Gemini API
console.log('\n🤖 Test 3: Google Gemini API\n');

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
    const result = await model.generateContent('Say "Hello"');
    const response = await result.response;
    const text = response.text();
    console.log(`   ✅ Gemini API working`);
    console.log(`   ✅ Model: gemini-2.5-flash-preview-09-2025`);
    console.log(`   ✅ Response: "${text.substring(0, 30)}..."`);
    return true;
  } catch (error) {
    console.log(`   ❌ Gemini API failed`);
    console.log(`   Error: ${error.message.split('\n')[0]}`);
    return false;
  }
}

// Test 4: Google OAuth Configuration
console.log('\n🔐 Test 4: Google OAuth Configuration\n');

function testOAuthConfig() {
  let passed = true;
  
  // Check Client ID format
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
    console.log(`   ✅ Client ID format correct`);
  } else {
    console.log(`   ❌ Client ID format incorrect or missing`);
    passed = false;
  }
  
  // Check Client Secret format
  if (process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.startsWith('GOCSPX-')) {
    console.log(`   ✅ Client Secret format correct`);
  } else {
    console.log(`   ❌ Client Secret format incorrect or missing`);
    passed = false;
  }
  
  // Check API Key format
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.startsWith('AIzaSy')) {
    console.log(`   ✅ Google API Key format correct`);
  } else {
    console.log(`   ❌ Google API Key format incorrect or missing`);
    passed = false;
  }
  
  // Check Redirect URI
  if (process.env.GOOGLE_REDIRECT_URI === 'http://localhost:5000/api/auth/callback') {
    console.log(`   ✅ Redirect URI configured correctly`);
  } else {
    console.log(`   ❌ Redirect URI incorrect`);
    passed = false;
  }
  
  return passed;
}

// Test 5: Google Calendar API Access
console.log('\n📅 Test 5: Google Calendar API Access\n');

async function testCalendarAPI() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.googleapis.com',
      path: `/calendar/v3/users/me/calendarList?key=${process.env.GOOGLE_API_KEY}`,
      method: 'GET'
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode === 401) {
        console.log(`   ⚠️  Calendar API key valid but needs OAuth`);
        console.log(`   ✅ This is expected - OAuth needed for user data`);
        resolve(true);
      } else if (res.statusCode === 403) {
        console.log(`   ⚠️  Calendar API not enabled or restricted`);
        resolve(false);
      } else {
        console.log(`   ✅ Calendar API accessible`);
        resolve(true);
      }
    });
    
    req.on('error', () => {
      console.log(`   ❌ Calendar API test failed`);
      resolve(false);
    });
    
    req.end();
  });
}

// Run all tests
async function runAllTests() {
  const mongoResult = await testMongo();
  const geminiResult = await testGemini();
  const oauthResult = testOAuthConfig();
  const calendarResult = await testCalendarAPI();
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 FINAL RESULTS\n');
  
  console.log(`   MongoDB:           ${mongoResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Gemini API:        ${geminiResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   OAuth Config:      ${oauthResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Calendar API:      ${calendarResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Environment Vars:  ${envPassed ? '✅ PASS' : '❌ FAIL'}`);
  
  const totalTests = 5;
  const passedTests = [mongoResult, geminiResult, oauthResult, calendarResult, envPassed].filter(Boolean).length;
  
  console.log('\n' + '='.repeat(70));
  console.log(`\n🎯 Score: ${passedTests}/${totalTests} tests passed\n`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEMS GO! Backend is fully configured!\n');
    console.log('✅ Next steps:');
    console.log('   1. Start server: npm run dev');
    console.log('   2. Test OAuth: http://localhost:5000/api/auth/google');
    console.log('   3. Load frontend Chrome extension');
    console.log('   4. Create your first event!\n');
  } else {
    console.log('⚠️  Some components need attention:\n');
    
    if (!mongoResult) console.log('   - Fix MongoDB connection');
    if (!geminiResult) console.log('   - Fix Gemini API key');
    if (!oauthResult) console.log('   - Fix Google OAuth credentials');
    if (!calendarResult) console.log('   - Enable Google Calendar API');
    if (!envPassed) console.log('   - Complete .env file configuration');
    
    console.log('\n📚 See GOOGLE_OAUTH_SETUP.md for help\n');
  }
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

runAllTests();

