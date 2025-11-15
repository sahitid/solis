// Test Gemini API connection and event parsing
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('\n🤖 Testing Gemini API...\n');

// Check if API key exists
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
  console.error('❌ GEMINI_API_KEY not set in .env file');
  console.log('\n💡 Please add your Gemini API key to backend/.env:');
  console.log('   GEMINI_API_KEY=your_actual_key_here\n');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGemini() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
    
    console.log('📝 Testing event parsing with: "Coffee with John tomorrow at 3pm"\n');
    
    const prompt = `Parse this into a JSON event:
"Coffee with John tomorrow at 3pm"

Return only JSON with: title, startDateTime, endDateTime, category, priority`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ SUCCESS! Gemini API is working!\n');
    console.log('📄 Response from Gemini:');
    console.log('─'.repeat(50));
    console.log(text);
    console.log('─'.repeat(50));
    console.log('\n🎉 Your Gemini API key is configured correctly!');
    console.log('💡 Event parsing will now work in the application.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED! Gemini API error:\n');
    console.error(`   Error: ${error.message}\n`);
    
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('400')) {
      console.log('💡 Your API key might be invalid. Please:');
      console.log('   1. Go to https://makersuite.google.com/app/apikey');
      console.log('   2. Create a new API key');
      console.log('   3. Copy it to your .env file\n');
    } else if (error.message.includes('quota') || error.message.includes('429')) {
      console.log('💡 You may have hit the rate limit. Wait a minute and try again.\n');
    } else {
      console.log('💡 Check your internet connection and try again.\n');
    }
    
    process.exit(1);
  }
}

testGemini();

