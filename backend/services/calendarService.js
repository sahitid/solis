const { google } = require('googleapis');
const { getAuthenticatedClient } = require('../config/google');

/**
 * Create an event in Google Calendar
 */
async function createCalendarEvent(userTokens, eventData) {
  try {
    const auth = getAuthenticatedClient(userTokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: new Date(eventData.startDateTime).toISOString(),
        timeZone: 'America/New_York', // TODO: Make this user-configurable
      },
      end: {
        dateTime: new Date(eventData.endDateTime).toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: eventData.attendees.map(a => ({
        email: a.email,
        displayName: a.name
      })).filter(a => a.email), // Only include attendees with emails
      reminders: {
        useDefault: true,
      },
      extendedProperties: {
        private: {
          flexibility: eventData.flexibility,
          priority: eventData.priority.toString(),
          category: eventData.category,
          createdVia: 'extension'
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      resource: event,
      sendUpdates: eventData.attendees.length > 0 ? 'all' : 'none'
    });

    return {
      success: true,
      event: response.data
    };

  } catch (error) {
    console.error('Calendar event creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get events from Google Calendar within a date range
 */
async function getCalendarEvents(userTokens, startDate, endDate) {
  try {
    const auth = getAuthenticatedClient(userTokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500 // Get up to 2500 events
    });

    return {
      success: true,
      events: response.data.items || []
    };

  } catch (error) {
    console.error('Calendar events fetch error:', error);
    return {
      success: false,
      error: error.message,
      events: []
    };
  }
}

/**
 * Update an existing calendar event
 */
async function updateCalendarEvent(userTokens, eventId, updates) {
  try {
    const auth = getAuthenticatedClient(userTokens);
    const calendar = google.calendar({ version: 'v3', auth });

    // First, get the existing event
    const existingEvent = await calendar.events.get({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: eventId
    });

    // Merge updates with existing event
    const updatedEvent = {
      ...existingEvent.data,
      ...updates
    };

    const response = await calendar.events.update({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: eventId,
      resource: updatedEvent,
      sendUpdates: 'all'
    });

    return {
      success: true,
      event: response.data
    };

  } catch (error) {
    console.error('Calendar event update error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete an event from Google Calendar
 */
async function deleteCalendarEvent(userTokens, eventId) {
  try {
    const auth = getAuthenticatedClient(userTokens);
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: eventId,
      sendUpdates: 'all'
    });

    return {
      success: true,
      message: 'Event deleted successfully'
    };

  } catch (error) {
    console.error('Calendar event deletion error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Watch for changes in Google Calendar (set up push notifications)
 */
async function setupCalendarWatch(userTokens, webhookUrl) {
  try {
    const auth = getAuthenticatedClient(userTokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.watch({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      resource: {
        id: `solis-watch-${Date.now()}`, // Unique channel ID
        type: 'web_hook',
        address: webhookUrl,
        token: process.env.GOOGLE_WEBHOOK_VERIFICATION_TOKEN,
        expiration: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    return {
      success: true,
      channelId: response.data.id,
      resourceId: response.data.resourceId,
      expiration: response.data.expiration
    };

  } catch (error) {
    console.error('Calendar watch setup error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Stop watching calendar changes
 */
async function stopCalendarWatch(userTokens, channelId, resourceId) {
  try {
    const auth = getAuthenticatedClient(userTokens);
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.channels.stop({
      resource: {
        id: channelId,
        resourceId: resourceId
      }
    });

    return {
      success: true,
      message: 'Calendar watch stopped'
    };

  } catch (error) {
    console.error('Stop calendar watch error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get a specific event by ID
 */
async function getEventById(userTokens, eventId) {
  try {
    const auth = getAuthenticatedClient(userTokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.get({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: eventId
    });

    return {
      success: true,
      event: response.data
    };

  } catch (error) {
    console.error('Get event by ID error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
  deleteCalendarEvent,
  setupCalendarWatch,
  stopCalendarWatch,
  getEventById
};

