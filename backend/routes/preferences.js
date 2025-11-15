const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @route   GET /api/preferences
// @desc    Get user preferences
// @access  Private
router.get('/', async (req, res) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ Email: email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      preferences: {
        workHours: user.Work_Hours,
        bedtime: user.Bedtime,
        preferredMeetingWindows: user.Preferred_Meeting_Windows,
        noMeetingZones: user.No_Meeting_Zones,
        flexibilityDefaults: user.Flexibility_Defaults,
        onboardingCompleted: user.Onboarding_Completed
      }
    });

  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// @route   PUT /api/preferences/:email
// @desc    Update user preferences
// @access  Private
router.put('/:email', async (req, res) => {
  const { email } = req.params;
  const {
    workHours,
    bedtime,
    preferredMeetingWindows,
    noMeetingZones,
    flexibilityDefaults,
    onboardingCompleted
  } = req.body;

  try {
    const user = await User.findOne({ Email: email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Track if this is first-time onboarding completion
    const wasOnboardingIncomplete = !user.Onboarding_Completed;

    // Update preferences
    if (workHours) user.Work_Hours = workHours;
    if (bedtime) user.Bedtime = bedtime;
    if (preferredMeetingWindows) user.Preferred_Meeting_Windows = preferredMeetingWindows;
    if (noMeetingZones) user.No_Meeting_Zones = noMeetingZones;
    if (flexibilityDefaults) user.Flexibility_Defaults = flexibilityDefaults;
    if (typeof onboardingCompleted === 'boolean') user.Onboarding_Completed = onboardingCompleted;

    await user.save();

    // Log onboarding completion
    if (wasOnboardingIncomplete && user.Onboarding_Completed) {
      console.log(`✅ User ${email} completed onboarding!`);
    }

    res.json({
      success: true,
      message: user.Onboarding_Completed && wasOnboardingIncomplete 
        ? 'Onboarding completed! Preferences saved successfully.'
        : 'Preferences updated successfully',
      preferences: {
        workHours: user.Work_Hours,
        bedtime: user.Bedtime,
        preferredMeetingWindows: user.Preferred_Meeting_Windows,
        noMeetingZones: user.No_Meeting_Zones,
        flexibilityDefaults: user.Flexibility_Defaults,
        onboardingCompleted: user.Onboarding_Completed
      },
      onboardingJustCompleted: wasOnboardingIncomplete && user.Onboarding_Completed
    });

  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// @route   POST /api/preferences/llm-assist
// @desc    Get LLM assistance for establishing baseline preferences
// @access  Private
router.post('/llm-assist', async (req, res) => {
  const { userMessage, conversationHistory } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'User message is required' });
  }

  try {
    const systemPrompt = `You are a helpful assistant helping users establish their calendar preferences for a smart scheduling system. Your goal is to help them define:

1. Typical work hours for each day of the week
2. Bedtime (with optional weekend variation)
3. Preferred meeting windows
4. "No-meeting zones" - times they want to keep free
5. Flexibility defaults for different event types (Rigid, Passive, Busy, Flexible)

Be conversational, ask clarifying questions, and provide suggestions based on typical work patterns. Help users think through their preferences without being pushy.

Flexibility definitions:
- Rigid: Event cannot be moved and cannot be overlapped
- Passive: Event can be overlapped but cannot be moved
- Busy: Event can be moved but cannot be overlapped
- Flexible: Event can be both moved and overlapped`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });

    // Build conversation context
    let conversationContext = systemPrompt + '\n\n';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext += 'Previous conversation:\n';
      conversationHistory.forEach(msg => {
        conversationContext += `${msg.role}: ${msg.content}\n`;
      });
    }
    conversationContext += `\nUser: ${userMessage}\n\nAssistant:`;

    const result = await model.generateContent(conversationContext);
    const response = await result.response;
    const assistantMessage = response.text();

    const updatedHistory = conversationHistory || [];
    updatedHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage }
    );

    res.json({
      success: true,
      message: assistantMessage,
      conversationHistory: updatedHistory
    });

  } catch (error) {
    console.error('LLM assistance error:', error);
    res.status(500).json({ error: 'Failed to get LLM assistance', details: error.message });
  }
});

// @route   POST /api/preferences/parse-preferences
// @desc    Parse user's natural language preferences into structured data
// @access  Private
router.post('/parse-preferences', async (req, res) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: 'User input is required' });
  }

  try {
    const systemPrompt = `You are a parser that extracts calendar preferences from natural language. 
    
Extract and return ONLY a JSON object with the following structure (no additional text):
{
  "workHours": {
    "monday": {"start": "HH:MM", "end": "HH:MM"},
    "tuesday": {"start": "HH:MM", "end": "HH:MM"},
    "wednesday": {"start": "HH:MM", "end": "HH:MM"},
    "thursday": {"start": "HH:MM", "end": "HH:MM"},
    "friday": {"start": "HH:MM", "end": "HH:MM"},
    "saturday": {"start": "HH:MM", "end": "HH:MM"},
    "sunday": {"start": "HH:MM", "end": "HH:MM"}
  },
  "bedtime": {
    "weekday": "HH:MM",
    "weekend": "HH:MM"
  },
  "preferredMeetingWindows": [
    {"day": "monday", "start": "HH:MM", "end": "HH:MM"}
  ],
  "noMeetingZones": [
    {"day": "monday", "start": "HH:MM", "end": "HH:MM", "description": "lunch"}
  ],
  "flexibilityDefaults": {
    "personal_tasks": "Flexible",
    "work_meetings": "Rigid",
    "social_events": "Busy"
  }
}

Use empty strings for days/times not mentioned. Use 24-hour format. Return ONLY the JSON object, no markdown.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
    
    const prompt = `${systemPrompt}\n\nUser input: "${userInput}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parsedText = response.text();
    
    // Extract JSON from response (remove markdown if present)
    let jsonText = parsedText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse preferences from input');
    }

    const preferences = JSON.parse(jsonMatch[0]);

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Preference parsing error:', error);
    res.status(500).json({ error: 'Failed to parse preferences', details: error.message });
  }
});

module.exports = router;

