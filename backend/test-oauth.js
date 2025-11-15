// Test OAuth Configuration
require('dotenv').config();

console.log('\n🔐 Testing OAuth Configuration...\n');

const checks = [];

// Check environment variables
console.log('📋 Checking Environment Variables:\n');

const requiredVars = {
  'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
  'GOOGLE_REDIRECT_URI': process.env.GOOGLE_REDIRECT_URI,
  'GOOGLE_API_KEY': process.env.GOOGLE_API_KEY,
  'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
  'MONGO_URI': process.env.MONGO_URI
};

let allConfigured = true;

for (const [key, value] of Object.entries(requiredVars)) {
  const isPlaceholder = !value || value.includes('your-') || value.includes('your_');
  const status = isPlaceholder ? '❌' : '✅';
  
  if (isPlaceholder) {
    allConfigured = false;
    console.log(`${status} ${key}: NOT SET`);
  } else {
    const display = key.includes('SECRET') || key.includes('KEY') || key.includes('URI') 
      ? value.substring(0, 20) + '...' 
      : value.substring(0, 40) + '...';
    console.log(`${status} ${key}: ${display}`);
  }
}

console.log('\n' + '━'.repeat(60));

if (allConfigured) {
  console.log('\n✅ ALL CREDENTIALS CONFIGURED!\n');
  console.log('🎯 Next steps:');
  console.log('   1. Start the server: npm run dev');
  console.log('   2. Test OAuth flow:');
  console.log('      Open: http://localhost:5000/api/auth/google');
  console.log('   3. You should see Google login page\n');
} else {
  console.log('\n⚠️  SOME CREDENTIALS MISSING\n');
  console.log('📝 To complete setup:');
  console.log('   1. Follow GOOGLE_OAUTH_SETUP.md');
  console.log('   2. Add credentials to backend/.env');
  console.log('   3. Run this test again\n');
}

console.log('━'.repeat(60) + '\n');

// Check format
console.log('🔍 Checking Credential Formats:\n');

if (requiredVars.GOOGLE_CLIENT_ID && !requiredVars.GOOGLE_CLIENT_ID.includes('your-')) {
  if (requiredVars.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
    console.log('✅ Client ID format: Correct');
  } else {
    console.log('⚠️  Client ID format: Should end with .apps.googleusercontent.com');
  }
}

if (requiredVars.GOOGLE_CLIENT_SECRET && !requiredVars.GOOGLE_CLIENT_SECRET.includes('your-')) {
  if (requiredVars.GOOGLE_CLIENT_SECRET.startsWith('GOCSPX-')) {
    console.log('✅ Client Secret format: Correct');
  } else {
    console.log('⚠️  Client Secret format: Should start with GOCSPX-');
  }
}

if (requiredVars.GOOGLE_API_KEY && !requiredVars.GOOGLE_API_KEY.includes('your-')) {
  if (requiredVars.GOOGLE_API_KEY.startsWith('AIzaSy')) {
    console.log('✅ API Key format: Correct');
  } else {
    console.log('⚠️  API Key format: Should start with AIzaSy');
  }
}

if (requiredVars.GEMINI_API_KEY && !requiredVars.GEMINI_API_KEY.includes('your-')) {
  if (requiredVars.GEMINI_API_KEY.startsWith('AIzaSy')) {
    console.log('✅ Gemini Key format: Correct');
  } else {
    console.log('⚠️  Gemini Key format: Should start with AIzaSy');
  }
}

if (requiredVars.MONGO_URI && !requiredVars.MONGO_URI.includes('your-')) {
  if (requiredVars.MONGO_URI.startsWith('mongodb+srv://') || requiredVars.MONGO_URI.startsWith('mongodb://')) {
    console.log('✅ MongoDB URI format: Correct');
  } else {
    console.log('⚠️  MongoDB URI format: Should start with mongodb:// or mongodb+srv://');
  }
}

console.log('\n');

