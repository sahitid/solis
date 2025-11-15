const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const { parseEventInput, assignEventMetadata } = require('../services/llmParser');
const { 
  createCalendarEvent, 
  getCalendarEvents,
  updateCalendarEvent,
  deleteCalendarEvent,
  getEventById,
  setupCalendarWatch,
  stopCalendarWatch
} = require('../services/calendarService');
const { findConflicts, generateResolutionRecommendation } = require('../services/conflictDetector');

// @route   POST /api/events/parse
// @desc    Parse natural language event input using LLM
// @access  Private
router.post('/parse', async (req, res) => {
  const { userInput, email } = req.body;

  if (!userInput || !email) {
    return res.status(400).json({ error: 'User input and email are required' });
  }

  try {
    // Get user preferences for context
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userPreferences = {
      workHours: user.Work_Hours,
      bedtime: user.Bedtime
    };

    // Parse the event using LLM
    const parseResult = await parseEventInput(userInput, userPreferences);

    res.json(parseResult);

  } catch (error) {
    console.error('Event parsing error:', error);
    res.status(500).json({ error: 'Failed to parse event', details: error.message });
  }
});

// @route   POST /api/events/create
// @desc    Create event via Chrome extension (Method 1)
// @access  Private
router.post('/create', async (req, res) => {
  const { email, eventData, skipConflictCheck = false } = req.body;

  if (!email || !eventData) {
    return res.status(400).json({ error: 'Email and event data are required' });
  }

  try {
    // Get user and validate authentication
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.OAuth_Token || !user.OAuth_Token.access_token) {
      return res.status(401).json({ error: 'User not authenticated with Google' });
    }

    // Validate event data
    if (!eventData.title || !eventData.startDateTime || !eventData.endDateTime) {
      return res.status(400).json({ error: 'Event title, start time, and end time are required' });
    }

    // Check for conflicts before creating (unless explicitly skipped)
    if (!skipConflictCheck) {
      const eventStartDate = new Date(eventData.startDateTime);
      const searchStart = new Date(eventStartDate.getTime() - 24 * 60 * 60 * 1000);
      const searchEnd = new Date(eventStartDate.getTime() + 24 * 60 * 60 * 1000);

      // IMPORTANT: Get events from Google Calendar (source of truth)
      // Then enrich with metadata from MongoDB
      const calendarResult = await getCalendarEvents(
        user.OAuth_Token,
        searchStart.toISOString(),
        searchEnd.toISOString()
      );

      if (!calendarResult.success) {
        console.warn('Failed to fetch calendar events for conflict check, falling back to MongoDB');
        // Fallback to MongoDB if Calendar API fails
        var existingEvents = await Event.find({
          User_Email: email,
          Event_Start_Date: {
            $gte: searchStart,
            $lte: searchEnd
          }
        });
      } else {
        // Get GCal event IDs
        const gcalEventIds = calendarResult.events.map(e => e.id).filter(id => id);
        
        // Get corresponding MongoDB records for metadata
        const dbEvents = await Event.find({
          User_Email: email,
          GCal_Event_ID: { $in: gcalEventIds }
        });
        
        // Create a map of GCal ID -> MongoDB event for quick lookup
        const dbEventMap = new Map();
        dbEvents.forEach(e => {
          if (e.GCal_Event_ID) {
            dbEventMap.set(e.GCal_Event_ID, e);
          }
        });
        
        // Use Google Calendar events (for real-time accuracy)
        // Enriched with MongoDB metadata (for conflict logic)
        var existingEvents = calendarResult.events.map(gcalEvent => {
          const dbEvent = dbEventMap.get(gcalEvent.id);
          
          return {
            Event_Start_Date: new Date(gcalEvent.start.dateTime || gcalEvent.start.date),
            Event_End_Date: new Date(gcalEvent.end.dateTime || gcalEvent.end.date),
            Event_Name: gcalEvent.summary || 'Untitled Event',
            Event_Priority: dbEvent?.Event_Priority || 2,
            Event_Flexibility: dbEvent?.Event_Flexibility || 'Busy',
            Event_Type: dbEvent?.Event_Type || 'other',
            Event_Guests: gcalEvent.attendees || [],
            GCal_Event_ID: gcalEvent.id,
            ID: dbEvent?.ID
          };
        });
      }

      const formattedNewEvent = {
        Event_Start_Date: eventData.startDateTime,
        Event_End_Date: eventData.endDateTime,
        Event_Priority: eventData.priority || 2,
        Event_Flexibility: eventData.flexibility || 'Busy',
        Event_Type: eventData.category || 'other',
        Event_Guests: eventData.attendees || [],
        Event_Name: eventData.title
      };

      const conflicts = findConflicts(formattedNewEvent, existingEvents);

      if (conflicts.length > 0) {
        // Return conflicts for user to resolve
        const conflictsWithRecommendations = conflicts.map(conflict => ({
          ...conflict,
          recommendation: generateResolutionRecommendation(conflict),
          conflictingEvent: {
            id: conflict.conflictingEvent.ID,
            name: conflict.conflictingEvent.Event_Name,
            startDate: conflict.conflictingEvent.Event_Start_Date,
            endDate: conflict.conflictingEvent.Event_End_Date,
            startTime: conflict.conflictingEvent.Start_Time,
            endTime: conflict.conflictingEvent.End_Time,
            priority: conflict.conflictingEvent.Event_Priority,
            flexibility: conflict.conflictingEvent.Event_Flexibility,
            attendees: conflict.conflictingEvent.Event_Guests
          }
        }));

        return res.status(409).json({
          success: false,
          hasConflicts: true,
          conflictCount: conflicts.length,
          message: `This event conflicts with ${conflicts.length} existing event${conflicts.length > 1 ? 's' : ''}`,
          conflicts: conflictsWithRecommendations,
          newEvent: formattedNewEvent
        });
      }
    }

    // No conflicts (or check skipped) - proceed with creation
    // Create event in Google Calendar
    const calendarResult = await createCalendarEvent(user.OAuth_Token, eventData);

    if (!calendarResult.success) {
      return res.status(500).json({ error: 'Failed to create calendar event', details: calendarResult.error });
    }

    const gcalEvent = calendarResult.event;

    // Save event to MongoDB
    const dbEvent = new Event({
      ID: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      User_Email: email,
      Event_Name: eventData.title,
      Event_Start_Date: new Date(eventData.startDateTime),
      Event_End_Date: new Date(eventData.endDateTime),
      Start_Time: new Date(eventData.startDateTime).toTimeString().substr(0, 5),
      End_Time: new Date(eventData.endDateTime).toTimeString().substr(0, 5),
      Event_Description: eventData.description || '',
      Event_Priority: eventData.priority || 2,
      Event_Flexibility: eventData.flexibility || 'Busy',
      Event_Type: eventData.category || 'other',
      Event_Guests: eventData.attendees || [],
      GCal_Event_ID: gcalEvent.id,
      Created_Via: 'extension'
    });

    await dbEvent.save();

    res.json({
      success: true,
      message: 'Event created successfully',
      event: dbEvent,
      calendarEvent: gcalEvent
    });

  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'Failed to create event', details: error.message });
  }
});

// @route   POST /api/events/sync
// @desc    Sync and assign metadata to directly added calendar events (Method 2)
// @access  Private
router.post('/sync', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.OAuth_Token || !user.OAuth_Token.access_token) {
      return res.status(401).json({ error: 'User not authenticated with Google' });
    }

    // Get events from the last 24 hours and next 30 days
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const calendarResult = await getCalendarEvents(user.OAuth_Token, startDate, endDate);

    if (!calendarResult.success) {
      return res.status(500).json({ error: 'Failed to fetch calendar events', details: calendarResult.error });
    }

    const gcalEvents = calendarResult.events;
    const syncedEvents = [];
    const newEvents = [];
    const deletedEvents = [];

    // Get all Google Calendar event IDs
    const gcalEventIds = new Set(gcalEvents.map(e => e.id).filter(id => id));

    // Find events in MongoDB that no longer exist in Google Calendar
    const allDbEvents = await Event.find({ User_Email: email });
    
    for (const dbEvent of allDbEvents) {
      if (dbEvent.GCal_Event_ID && !gcalEventIds.has(dbEvent.GCal_Event_ID)) {
        // This event was deleted from Google Calendar
        await Event.deleteOne({ _id: dbEvent._id });
        deletedEvents.push({
          id: dbEvent.ID,
          name: dbEvent.Event_Name,
          gcalId: dbEvent.GCal_Event_ID
        });
        console.log(`🗑️ Removed deleted event from DB: ${dbEvent.Event_Name}`);
      }
    }

    // Process each calendar event
    for (const gcalEvent of gcalEvents) {
      // Skip if no ID
      if (!gcalEvent.id) continue;

      // Check if we already have this event in our database
      const existingEvent = await Event.findOne({ GCal_Event_ID: gcalEvent.id });

      if (existingEvent) {
        syncedEvents.push(existingEvent);
        continue;
      }

      // This is a new event added directly to calendar
      // Assign metadata using LLM
      const metadataResult = await assignEventMetadata(
        gcalEvent.summary || 'Untitled Event',
        gcalEvent.description || ''
      );

      const metadata = metadataResult.metadata;

      // Extract attendees
      const attendees = (gcalEvent.attendees || []).map(a => ({
        email: a.email,
        name: a.displayName || '',
        responseStatus: a.responseStatus || 'needsAction'
      }));

      // Create event in database
      const dbEvent = new Event({
        ID: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        User_Email: email,
        Event_Name: gcalEvent.summary || 'Untitled Event',
        Event_Start_Date: new Date(gcalEvent.start.dateTime || gcalEvent.start.date),
        Event_End_Date: new Date(gcalEvent.end.dateTime || gcalEvent.end.date),
        Start_Time: gcalEvent.start.dateTime 
          ? new Date(gcalEvent.start.dateTime).toTimeString().substr(0, 5)
          : '00:00',
        End_Time: gcalEvent.end.dateTime
          ? new Date(gcalEvent.end.dateTime).toTimeString().substr(0, 5)
          : '23:59',
        Event_Description: gcalEvent.description || '',
        Event_Priority: metadata.priority,
        Event_Flexibility: metadata.flexibility,
        Event_Type: metadata.category,
        Event_Guests: attendees,
        GCal_Event_ID: gcalEvent.id,
        Created_Via: 'direct_calendar'
      });

      await dbEvent.save();
      newEvents.push(dbEvent);
    }

    res.json({
      success: true,
      message: 'Calendar synced successfully',
      stats: {
        totalCalendarEvents: gcalEvents.length,
        existingEvents: syncedEvents.length,
        newEvents: newEvents.length,
        deletedEvents: deletedEvents.length
      },
      newEvents,
      deletedEvents
    });

  } catch (error) {
    console.error('Event sync error:', error);
    res.status(500).json({ error: 'Failed to sync events', details: error.message });
  }
});

// @route   GET /api/events/:email
// @desc    Get all events for a user
// @access  Private
router.get('/:email', async (req, res) => {
  const { email } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const query = { User_Email: email };

    // Add date filters if provided
    if (startDate || endDate) {
      query.Event_Start_Date = {};
      if (startDate) query.Event_Start_Date.$gte = new Date(startDate);
      if (endDate) query.Event_Start_Date.$lte = new Date(endDate);
    }

    const events = await Event.find(query).sort({ Event_Start_Date: 1 });

    res.json({
      success: true,
      count: events.length,
      events
    });

  } catch (error) {
    console.error('Event fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch events', details: error.message });
  }
});

// @route   PUT /api/events/:eventId
// @desc    Update an event
// @access  Private
router.put('/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { email, updates } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const event = await Event.findOne({ ID: eventId, User_Email: email });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update in Google Calendar if dates/times changed
    if (updates.startDateTime || updates.endDateTime || updates.title || updates.description) {
      const calendarUpdates = {};
      
      if (updates.title) calendarUpdates.summary = updates.title;
      if (updates.description) calendarUpdates.description = updates.description;
      if (updates.startDateTime) {
        calendarUpdates.start = {
          dateTime: new Date(updates.startDateTime).toISOString(),
          timeZone: 'America/New_York'
        };
      }
      if (updates.endDateTime) {
        calendarUpdates.end = {
          dateTime: new Date(updates.endDateTime).toISOString(),
          timeZone: 'America/New_York'
        };
      }

      await updateCalendarEvent(user.OAuth_Token, event.GCal_Event_ID, calendarUpdates);
    }

    // Update in database
    if (updates.title) event.Event_Name = updates.title;
    if (updates.startDateTime) {
      event.Event_Start_Date = new Date(updates.startDateTime);
      event.Start_Time = new Date(updates.startDateTime).toTimeString().substr(0, 5);
    }
    if (updates.endDateTime) {
      event.Event_End_Date = new Date(updates.endDateTime);
      event.End_Time = new Date(updates.endDateTime).toTimeString().substr(0, 5);
    }
    if (updates.description !== undefined) event.Event_Description = updates.description;
    if (updates.priority) event.Event_Priority = updates.priority;
    if (updates.flexibility) event.Event_Flexibility = updates.flexibility;
    if (updates.category) event.Event_Type = updates.category;
    if (updates.attendees) event.Event_Guests = updates.attendees;

    await event.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      event
    });

  } catch (error) {
    console.error('Event update error:', error);
    res.status(500).json({ error: 'Failed to update event', details: error.message });
  }
});

// @route   DELETE /api/events/:eventId
// @desc    Delete an event
// @access  Private
router.delete('/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const event = await Event.findOne({ ID: eventId, User_Email: email });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete from Google Calendar
    await deleteCalendarEvent(user.OAuth_Token, event.GCal_Event_ID);

    // Delete from database
    await Event.deleteOne({ ID: eventId });

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Event deletion error:', error);
    res.status(500).json({ error: 'Failed to delete event', details: error.message });
  }
});

// @route   POST /api/events/watch/start
// @desc    Start watching calendar for changes
// @access  Private
router.post('/watch/start', async (req, res) => {
  const { email, webhookUrl } = req.body;

  if (!email || !webhookUrl) {
    return res.status(400).json({ error: 'Email and webhook URL are required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const watchResult = await setupCalendarWatch(user.OAuth_Token, webhookUrl);

    if (!watchResult.success) {
      return res.status(500).json({ error: 'Failed to setup calendar watch', details: watchResult.error });
    }

    res.json({
      success: true,
      message: 'Calendar watch started',
      watch: {
        channelId: watchResult.channelId,
        resourceId: watchResult.resourceId,
        expiration: watchResult.expiration
      }
    });

  } catch (error) {
    console.error('Calendar watch start error:', error);
    res.status(500).json({ error: 'Failed to start calendar watch', details: error.message });
  }
});

// @route   POST /api/events/webhook
// @desc    Webhook endpoint for Google Calendar push notifications
// @access  Public (with token verification)
router.post('/webhook', async (req, res) => {
  const token = req.headers['x-goog-channel-token'];

  // Verify webhook token
  if (token !== process.env.GOOGLE_WEBHOOK_VERIFICATION_TOKEN) {
    return res.status(401).json({ error: 'Invalid webhook token' });
  }

  // Acknowledge receipt immediately
  res.status(200).send('OK');

  // Process the notification asynchronously
  const resourceState = req.headers['x-goog-resource-state'];
  const channelId = req.headers['x-goog-channel-id'];

  console.log('Calendar webhook received:', {
    resourceState,
    channelId,
    timestamp: new Date()
  });

  // If there's a change, trigger sync for affected users
  if (resourceState === 'exists' || resourceState === 'update') {
    // In a production app, you'd identify which user this belongs to
    // and trigger a sync for that user
    console.log('Calendar changed, should trigger sync');
  }
});

module.exports = router;

