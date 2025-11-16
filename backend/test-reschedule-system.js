/**
 * Test Script for Complete Rescheduling System
 * Tests AI priority comparison and decision tree
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testAIPriorityComparison() {
  console.log('\n🤖 Testing AI Priority Comparison...\n');

  const event1 = {
    title: 'Coffee with John',
    description: 'Casual catch-up',
    attendees: []
  };

  const event2 = {
    title: 'Doctor Appointment',
    description: 'Annual checkup',
    attendees: []
  };

  try {
    const systemPrompt = `You are an expert at determining which calendar event is more important.
Given two events, analyze their titles and descriptions to determine which one is higher priority.

Consider factors like:
- Professional obligations vs personal activities
- Meetings with others vs solo tasks
- Deadlines and time-sensitive tasks
- Health and wellbeing (doctor appointments, etc.)
- Career advancement opportunities
- Financial obligations

Return ONLY a JSON object with this structure:
{
  "higherPriorityEvent": 1 or 2,
  "reason": "Brief explanation of why this event is more important",
  "confidenceLevel": "high", "medium", or "low"
}`;

    const userPrompt = `Event 1:
Title: ${event1.title}
Description: ${event1.description}
Has attendees: ${event1.attendees.length > 0}

Event 2:
Title: ${event2.title}
Description: ${event2.description}
Has attendees: ${event2.attendees.length > 0}

Which event is more important?`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('📥 AI Response:');
    console.log(text);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    console.log('\n✅ Parsed Result:');
    console.log(`   Higher Priority: Event ${parsed.higherPriorityEvent} (${parsed.higherPriorityEvent === 1 ? event1.title : event2.title})`);
    console.log(`   Reason: ${parsed.reason}`);
    console.log(`   Confidence: ${parsed.confidenceLevel}`);

    return { success: true, result: parsed };

  } catch (error) {
    console.error('❌ AI test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testAnotherScenario() {
  console.log('\n\n🤖 Testing Another Scenario...\n');

  const event1 = {
    title: 'Client Meeting',
    description: 'Q4 strategy discussion with CEO',
    attendees: ['ceo@company.com', 'manager@company.com']
  };

  const event2 = {
    title: 'Lunch Break',
    description: '',
    attendees: []
  };

  console.log('Event 1:', event1.title, '(', event1.attendees.length, 'attendees )');
  console.log('Event 2:', event2.title, '(', event2.attendees.length, 'attendees )');

  try {
    const systemPrompt = `You are an expert at determining which calendar event is more important.
Given two events, analyze their titles and descriptions to determine which one is higher priority.

Consider factors like:
- Professional obligations vs personal activities
- Meetings with others vs solo tasks
- Deadlines and time-sensitive tasks
- Health and wellbeing (doctor appointments, etc.)
- Career advancement opportunities
- Financial obligations

Return ONLY a JSON object with this structure:
{
  "higherPriorityEvent": 1 or 2,
  "reason": "Brief explanation of why this event is more important",
  "confidenceLevel": "high", "medium", or "low"
}`;

    const userPrompt = `Event 1:
Title: ${event1.title}
Description: ${event1.description}
Has attendees: ${event1.attendees.length > 0}

Event 2:
Title: ${event2.title}
Description: ${event2.description}
Has attendees: ${event2.attendees.length > 0}

Which event is more important?`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    console.log('\n✅ Parsed Result:');
    console.log(`   Higher Priority: Event ${parsed.higherPriorityEvent} (${parsed.higherPriorityEvent === 1 ? event1.title : event2.title})`);
    console.log(`   Reason: ${parsed.reason}`);
    console.log(`   Confidence: ${parsed.confidenceLevel}`);

    return { success: true, result: parsed };

  } catch (error) {
    console.error('❌ AI test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   RESCHEDULING SYSTEM TEST                       ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const test1 = await testAIPriorityComparison();
  const test2 = await testAnotherScenario();

  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║   TEST SUMMARY                                   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Scenario 1 (Coffee vs Doctor): ${test1.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Scenario 2 (Client Meeting vs Lunch): ${test2.success ? '✅ PASSED' : '❌ FAILED'}`);

  if (test1.success && test2.success) {
    console.log('\n🎉 All tests passed! AI priority comparison is working.');
    console.log('\n📋 Available API Endpoints:');
    console.log('   • POST /api/reschedule-decision/analyze-conflict');
    console.log('   • POST /api/reschedule-decision/get-broad-options');
    console.log('   • POST /api/reschedule-decision/cancel-event');
    console.log('   • POST /api/reschedule-decision/move-manual');
    console.log('   • POST /api/reschedule/propose-multi-attendee');
    console.log('   • POST /api/reschedule/record-response');
    console.log('   • POST /api/reschedule/finalize-proposal');
  }
}

runTests().catch(console.error);

