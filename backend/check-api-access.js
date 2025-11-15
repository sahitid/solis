// Check Gemini API access directly
require('dotenv').config();
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY;

console.log('\n🔍 Checking Gemini API Access...\n');
console.log(`API Key: ${API_KEY.substring(0, 15)}...`);

// Try to list available models
const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models?key=${API_KEY}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}\n`);
    
    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        if (response.models && response.models.length > 0) {
          console.log('✅ API ACCESS WORKING!\n');
          console.log('📋 Available Models:\n');
          response.models.forEach(model => {
            console.log(`   - ${model.name}`);
            if (model.displayName) console.log(`     Display: ${model.displayName}`);
          });
          console.log('\n💡 Use one of these model names in your code!\n');
        } else {
          console.log('⚠️  API responds but no models available');
          console.log('   Response:', data);
        }
      } catch (e) {
        console.log('❌ Could not parse response');
        console.log('   Raw response:', data);
      }
    } else {
      console.log('❌ API Error\n');
      console.log('Response:', data);
      console.log('\n💡 Possible issues:');
      console.log('   - API not yet fully activated (wait 2-3 minutes)');
      console.log('   - Wrong project selected');
      console.log('   - API key restrictions');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Network Error:', e.message);
});

req.end();

