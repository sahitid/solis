const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Parse natural language event input using Google Gemini
 * Extracts: Title, Duration, Attendees, Flexibility, Category, Priority, Date/Time
 */
async function parseEventInput(userInput, userPreferences = {}) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });

    const systemPrompt = `You are an expert calendar event parser. Extract event details from natural language input and return ONLY a JSON object with this exact structure (no additional text, no markdown, just raw JSON):

{
  "title": "Event title",
  "startDateTime": "YYYY-MM-DDTHH:MM:SS",
  "endDateTime": "YYYY-MM-DDTHH:MM:SS",
  "duration": number (in minutes),
  "attendees": [
    {
      "email": "email@example.com",
      "name": "Name (optional)"
    }
  ],
  "flexibility": "Rigid" | "Passive" | "Busy" | "Flexible",
  "category": "work" | "personal" | "social" | "meeting" | "studying" | "free" | "other",
  "priority": 1 | 2 | 3,
  "description": "Additional details if mentioned"
}

Flexibility definitions:
- Rigid: Important, unmovable events (cannot move, cannot overlap)
- Passive: Events you can multitask during (can overlap, cannot move)  
- Busy: Important but flexible timing (can move, cannot overlap)
- Flexible: Low priority, very movable (can move, can overlap)

Priority scale:
- 3: High priority (critical meetings, deadlines)
- 2: Medium priority (regular meetings, tasks)
- 1: Low priority (optional events, social)

Category rules:
- "work": Job-related tasks, work meetings
- "meeting": Any meeting with others
- "personal": Personal tasks, appointments
- "social": Social events, gatherings
- "studying": Study sessions, classes
- "free": Free time, breaks
- "other": Anything else

For dates/times:
- "tomorrow" = next day
- "next Monday" = upcoming Monday
- Default to user's work hours if time not specified
- If only date given, suggest 1 hour duration during work hours
- Use ISO 8601 format (YYYY-MM-DDTHH:MM:SS)
- If no year specified, use current year
- If time is "3pm", convert to 15:00:00

If attendees mentioned by name only (no email), include name but leave email empty.

Return ONLY the JSON object, nothing else.`;

    const userContext = userPreferences.workHours 
      ? `\n\nUser's typical work hours: ${JSON.stringify(userPreferences.workHours)}`
      : '';

    const prompt = `${systemPrompt}${userContext}\n\nUser input: "${userInput}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parsedText = response.text();
    
    // Extract JSON from response (remove markdown code blocks if present)
    let jsonText = parsedText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse event from input');
    }

    const eventData = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!eventData.title) {
      throw new Error('Event title is required');
    }

    // Ensure we have start and end times
    if (!eventData.startDateTime || !eventData.endDateTime) {
      throw new Error('Event date and time are required');
    }

    // Set defaults for optional fields
    eventData.flexibility = eventData.flexibility || 'Busy';
    eventData.category = eventData.category || 'other';
    eventData.priority = eventData.priority || 2;
    eventData.attendees = eventData.attendees || [];
    eventData.description = eventData.description || '';

    return {
      success: true,
      event: eventData
    };

  } catch (error) {
    console.error('LLM parsing error:', error);
    return {
      success: false,
      error: error.message,
      fallback: {
        title: userInput,
        flexibility: 'Busy',
        category: 'other',
        priority: 2,
        attendees: [],
        description: ''
      }
    };
  }
}

/**
 * Assign category and metadata to directly added calendar events
 */
async function assignEventMetadata(eventTitle, eventDescription = '') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });

    const systemPrompt = `You are analyzing a calendar event to assign metadata. Based on the event title and description, return ONLY a JSON object (no additional text, no markdown, just raw JSON):

{
  "category": "work" | "personal" | "social" | "meeting" | "studying" | "free" | "other",
  "priority": 1 | 2 | 3,
  "flexibility": "Rigid" | "Passive" | "Busy" | "Flexible",
  "suggestedType": "Brief explanation of why you chose these values"
}

Category rules:
- "work": Job-related tasks, work meetings, professional obligations
- "meeting": Any meeting with others (internal or external)
- "personal": Personal tasks, appointments, errands
- "social": Social events, gatherings, casual meetups
- "studying": Study sessions, classes, educational activities
- "free": Free time, breaks, leisure
- "other": Anything that doesn't fit above

Priority guidelines:
- 3: High priority - critical meetings, deadlines, important appointments
- 2: Medium priority - regular meetings, typical tasks
- 1: Low priority - optional events, social activities, flexible tasks

Flexibility guidelines:
- Rigid: Important unmovable events (client meetings, presentations, deadlines)
- Busy: Important but timing flexible (team meetings, work tasks)
- Passive: Can multitask during (calls, webinars, monitoring)
- Flexible: Very movable (personal tasks, social events, optional activities)

Return ONLY the JSON object, nothing else.`;

    const prompt = `${systemPrompt}\n\nEvent Title: ${eventTitle}\nDescription: ${eventDescription || 'None'}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parsedText = response.text();
    
    // Extract JSON from response
    let jsonText = parsedText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Could not parse metadata');
    }

    const metadata = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      metadata: {
        category: metadata.category || 'other',
        priority: metadata.priority || 2,
        flexibility: metadata.flexibility || 'Busy',
        reasoning: metadata.suggestedType
      }
    };

  } catch (error) {
    console.error('Metadata assignment error:', error);
    return {
      success: false,
      metadata: {
        category: 'other',
        priority: 2,
        flexibility: 'Busy',
        reasoning: 'Default values due to parsing error'
      }
    };
  }
}

module.exports = {
  parseEventInput,
  assignEventMetadata
};
