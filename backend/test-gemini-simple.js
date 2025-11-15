// Simple Gemini API test
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('\n🔍 Testing Gemini API Configuration...\n');

// Check API key
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your-')) {
  console.error('❌ No valid API key found in .env');
  process.exit(1);
}

console.log('✅ API key is set');
console.log(`   Key starts with: ${process.env.GEMINI_API_KEY.substring(0, 10)}...\n`);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testWithDifferentModels() {
  const modelsToTry = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest', 
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'models/gemini-pro',
    'models/gemini-1.5-flash'
  ];
  
  console.log('🔄 Trying different model names...\n');
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`   Testing: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "Hello"');
      const response = await result.response;
      const text = response.text();
      
      console.log(`   ✅ SUCCESS with ${modelName}`);
      console.log(`   Response: ${text}\n`);
      
      console.log('━'.repeat(60));
      console.log('🎉 GEMINI API IS WORKING!');
      console.log(`✅ Use this model name: ${modelName}`);
      console.log('━'.repeat(60));
      console.log('\nℹ️  Your application will use this model for:');
      console.log('   - Event parsing from natural language');
      console.log('   - AI preference setup');
      console.log('   - Email content generation\n');
      
      process.exit(0);
    } catch (error) {
      console.log(`   ❌ ${modelName}: ${error.message.split('\n')[0]}`);
    }
  }
  
  console.log('\n━'.repeat(60));
  console.log('❌ NO MODELS WORKED');
  console.log('━'.repeat(60));
  console.log('\n💡 Next steps:');
  console.log('   1. Wait 2-3 minutes for API to fully activate');
  console.log('   2. Enable Generative Language API manually:');
  console.log('      https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
  console.log('   3. Make sure you selected the correct project');
  console.log('   4. Try running this test again\n');
  
  process.exit(1);
}

testWithDifferentModels();

