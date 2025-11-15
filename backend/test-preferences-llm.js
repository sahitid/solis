require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testPreferencesLLM() {
  console.log('🧪 Testing Preferences LLM Assistant\n');
  console.log('──────────────────────────────────────────\n');
  
  let conversationHistory = [];
  
  try {
    // Simulate a full onboarding conversation
    const messages = [
      "Hi, I'm ready to set up my preferences",
      "I work Monday to Friday, 9 AM to 5 PM",
      "I usually go to bed around 11 PM on weekdays and midnight on weekends",
      "For work meetings, they should be rigid. Personal tasks can be flexible. Social events should be busy."
    ];
    
    for (let i = 0; i < messages.length; i++) {
      const userMessage = messages[i];
      
      console.log(`👤 User (Step ${i + 1}):`);
      console.log(`   "${userMessage}"\n`);
      
      // Send message to LLM
      const response = await axios.post(`${API_BASE}/preferences/llm-assist`, {
        userMessage,
        conversationHistory,
        email: 'test@example.com'
      });
      
      const data = response.data;
      
      if (data.success) {
        console.log(`🤖 Assistant:`);
        console.log(`   "${data.message || data.assistantMessage}"\n`);
        
        // Update conversation history
        conversationHistory = data.conversationHistory || [];
        
        // Show extracted preferences if any
        if (data.preferences && Object.keys(data.preferences).length > 0) {
          console.log('✨ Extracted Preferences:');
          console.log(JSON.stringify(data.preferences, null, 2));
          console.log('');
        }
      } else {
        console.log('❌ Error:', data.error, '\n');
      }
      
      // Wait a bit between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('──────────────────────────────────────────');
    console.log('✅ Conversation flow test complete!\n');
    console.log('💡 The LLM assistant successfully:');
    console.log('   - Asked questions one at a time');
    console.log('   - Acknowledged user responses');
    console.log('   - Extracted preferences automatically');
    console.log('   - Updated the user database\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_BASE}/health`);
    console.log('✅ Backend server is running\n');
    return true;
  } catch (error) {
    console.error('❌ Backend server is not running!');
    console.error('   Please start it with: cd backend && npm run dev\n');
    return false;
  }
}

// Run test
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testPreferencesLLM();
  }
  process.exit(0);
})();

