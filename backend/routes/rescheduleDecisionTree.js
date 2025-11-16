const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const {
  findBestRescheduleSlot,
  findBestDaysForRescheduling,
  findAvailableTimeSlots,
  calculateEventDuration,
  compareEventPriorityWithAI
} = require('../services/rescheduler');
const { updateCalendarEvent, deleteCalendarEvent, getCalendarEvents } = require('../services/calendarService');

// @route   POST /api/reschedule-decision/analyze-conflict
// @desc    Analyze conflict and suggest best action (using AI for priority)
// @access  Private
router.post('/analyze-conflict', async (req, res) => {
  const { email, newEventData, conflictingEventId } = req.body;

  if (!email || !newEventData || !conflictingEventId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conflictingEvent = await Event.findOne({ 
      ID: conflictingEventId, 
      User_Email: email 
    });
    
    if (!conflictingEvent) {
      return res.status(404).json({ error: 'Conflicting event not found' });
    }

    // Use AI to compare priorities
    const aiComparison = await compareEventPriorityWithAI(newEventData, conflictingEvent);

    // IMPORTANT: Always move the LOWER priority event
    // If new event is higher priority (1), move the existing event
    // If existing event is higher priority (2), move the new event
    const shouldMoveNewEvent = aiComparison.higherPriorityEvent === 2; // Existing event is higher priority
    const eventToMove = shouldMoveNewEvent ? newEventData : conflictingEvent;
    const eventToKeep = shouldMoveNewEvent ? conflictingEvent : newEventData;

    console.log(`🎯 AI Decision: ${shouldMoveNewEvent ? 'Move NEW event' : 'Move EXISTING event'}`);
    console.log(`📌 Event to move: ${eventToMove.Event_Name || eventToMove.title}`);
    console.log(`📌 Event to keep: ${eventToKeep.Event_Name || eventToKeep.title}`);

    // Check if events have attendees
    const hasAttendees = (eventToMove.attendees || eventToMove.Event_Guests || []).length > 0;

    // Find best same-day slot
    const duration = calculateEventDuration(
      eventToMove.startDateTime || eventToMove.Event_Start_Date,
      eventToMove.endDateTime || eventToMove.Event_End_Date
    );

    // IMPORTANT: Get events from Google Calendar (source of truth)
    // Then enrich with metadata from MongoDB
    const eventDate = new Date(eventToMove.startDateTime || eventToMove.Event_Start_Date);
    const dayStart = new Date(eventDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(eventDate);
    dayEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Fetching events from Google Calendar for ${eventDate.toDateString()}`);
    
    const calendarResult = await getCalendarEvents(
      user.OAuth_Token,
      dayStart.toISOString(),
      dayEnd.toISOString()
    );

    let allEvents = [];
    
    if (!calendarResult.success) {
      console.warn('⚠️ Failed to fetch calendar events, falling back to MongoDB');
      // Fallback to MongoDB if Calendar API fails
      allEvents = await Event.find({
        User_Email: email,
        ID: { $ne: conflictingEventId }
      });
    } else {
      console.log(`✅ Found ${calendarResult.events.length} events in Google Calendar`);
      
      // Get GCal event IDs
      const gcalEventIds = calendarResult.events.map(e => e.id).filter(id => id);

      // Get corresponding MongoDB records for metadata
      const dbEvents = await Event.find({
        User_Email: email,
        GCal_Event_ID: { $in: gcalEventIds }
      });

      console.log(`📊 Found ${dbEvents.length} events with metadata in MongoDB`);

      // Create a map of GCal ID -> MongoDB event for quick lookup
      const dbEventMap = new Map();
      dbEvents.forEach(e => {
        if (e.GCal_Event_ID) {
          dbEventMap.set(e.GCal_Event_ID, e);
        }
      });

      // Use Google Calendar events (for real-time accuracy)
      // Enriched with MongoDB metadata (for conflict logic)
      allEvents = calendarResult.events
        .filter(gcalEvent => gcalEvent.id !== conflictingEvent?.GCal_Event_ID) // Exclude the conflicting event
        .map(gcalEvent => {
          const dbEvent = dbEventMap.get(gcalEvent.id);

          const enrichedEvent = {
            Event_Start_Date: new Date(gcalEvent.start.dateTime || gcalEvent.start.date),
            Event_End_Date: new Date(gcalEvent.end.dateTime || gcalEvent.end.date),
            Event_Name: gcalEvent.summary || 'Untitled Event',
            Event_Priority: dbEvent?.Event_Priority || 2,
            Event_Flexibility: dbEvent?.Event_Flexibility || 'Busy', // Default to Busy if no metadata
            Event_Type: dbEvent?.Event_Type || 'other',
            Event_Guests: gcalEvent.attendees || [],
            GCal_Event_ID: gcalEvent.id,
            ID: dbEvent?.ID
          };

          console.log(`  📌 ${enrichedEvent.Event_Name} @ ${enrichedEvent.Event_Start_Date.toLocaleTimeString()} - ${enrichedEvent.Event_Flexibility}`);

          return enrichedEvent;
        });

      console.log(`📋 Total events for slot finding: ${allEvents.length}`);
    }

    // IMPORTANT: When finding slots, exclude the time where the event-being-moved currently exists
    // Otherwise it will suggest moving it to the same time it's already at!
    const eventToMoveStartTime = new Date(eventToMove.startDateTime || eventToMove.Event_Start_Date);
    const eventToMoveEndTime = new Date(eventToMove.endDateTime || eventToMove.Event_End_Date);
    
    console.log(`⏰ Event to move current time: ${eventToMoveStartTime.toLocaleTimeString()} - ${eventToMoveEndTime.toLocaleTimeString()}`);
    
    // Filter out the event being moved from the events list
    // So we can find slots that don't include its current time
    const eventsExcludingMovingEvent = allEvents.filter(evt => {
      // If moving existing event, exclude it by GCal_Event_ID
      if (!shouldMoveNewEvent && evt.GCal_Event_ID === conflictingEvent.GCal_Event_ID) {
        console.log(`🔹 Excluding event being moved: ${evt.Event_Name}`);
        return false;
      }
      return true;
    });
    
    console.log(`📋 Searching ${eventsExcludingMovingEvent.length} events (excluded the one being moved)`);

    let sameDayBestSlot = findBestRescheduleSlot(
      duration,
      eventToMoveStartTime,
      eventsExcludingMovingEvent, // Use filtered list
      { Work_Hours: {}, Bedtime: {}, No_Meeting_Zones: [], Preferred_Meeting_Windows: [] },
      true // same day only
    );

    console.log(`🎯 Best slot found:`, sameDayBestSlot ? `${sameDayBestSlot.startTime} - ${sameDayBestSlot.endTime}` : 'None');
    
    // VALIDATION: Make sure the suggested slot is NOT the same as the current time
    if (sameDayBestSlot) {
      const suggestedStart = new Date(sameDayBestSlot.startDateTime);
      const suggestedEnd = new Date(sameDayBestSlot.endDateTime);
      
      if (suggestedStart.getTime() === eventToMoveStartTime.getTime() && 
          suggestedEnd.getTime() === eventToMoveEndTime.getTime()) {
        console.error('❌ ERROR: Suggested slot is the same as current time! This should not happen.');
        // Set to null to force "no same-day slots" flow
        sameDayBestSlot = null;
      }
    }

    res.json({
      success: true,
      analysis: {
        aiPriorityComparison: {
          higherPriorityEvent: shouldMoveNewEvent ? 'existing' : 'new',
          reason: aiComparison.reason,
          confidenceLevel: aiComparison.confidenceLevel
        },
        recommendation: {
          action: shouldMoveNewEvent ? 'move_new_event' : 'move_existing_event',
          eventToMove: {
            id: eventToMove.ID || 'new',
            name: eventToMove.Event_Name || eventToMove.title,
            hasAttendees: hasAttendees
          },
          eventToKeep: {
            id: eventToKeep.ID || 'new',
            name: eventToKeep.Event_Name || eventToKeep.title
          }
        },
        sameDayBestSlot: sameDayBestSlot,
        requiresEmailApproval: hasAttendees
      },
      decisionTree: {
        step: 'initial_recommendation',
        options: sameDayBestSlot ? [
          {
            action: 'accept_best_slot',
            label: `Yes, move to ${sameDayBestSlot.startTime}`,
            requiresEmail: hasAttendees
          },
          {
            action: 'reject_and_explore',
            label: 'No, show me other options',
            requiresEmail: false
          }
        ] : [
          {
            action: 'explore_options',
            label: 'Find other time slots',
            requiresEmail: false
          }
        ]
      }
    });

  } catch (error) {
    console.error('Analyze conflict error:', error);
    res.status(500).json({ error: 'Failed to analyze conflict', details: error.message });
  }
});

// @route   POST /api/reschedule-decision/get-broad-options
// @desc    Get broad decision tree options (cancel, different day, same day)
// @access  Private
router.post('/get-broad-options', async (req, res) => {
  const { email, eventId } = req.body;

  if (!email || !eventId) {
    return res.status(400).json({ error: 'Email and event ID required' });
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

    const duration = calculateEventDuration(event.Event_Start_Date, event.Event_End_Date);
    const allEvents = await Event.find({
      User_Email: email,
      ID: { $ne: eventId }
    });

    // Get top 3 alternative days
    // Get original event date
    const originalDate = new Date(event.Event_Start_Date);
    
    const bestDays = findBestDaysForRescheduling(
      duration,
      allEvents,
      { Work_Hours: {}, Bedtime: {}, No_Meeting_Zones: [], Preferred_Meeting_Windows: [] },
      14, // Search next 14 days
      originalDate // Only show dates >= original date
    );
    
    console.log(`📅 Best alternative days (all >= ${originalDate.toDateString()}):`, bestDays.map(d => d.date));

    // Get same-day alternatives (2-3 slots)
    const sameDaySlots = findAvailableTimeSlots(
      duration,
      event.Event_Start_Date,
      allEvents,
      { Work_Hours: {}, Bedtime: {}, No_Meeting_Zones: [], Preferred_Meeting_Windows: [] },
      { maxSlots: 3, sameDayOnly: true }
    );

    res.json({
      success: true,
      event: {
        id: event.ID,
        name: event.Event_Name,
        currentStart: event.Event_Start_Date,
        currentEnd: event.Event_End_Date,
        hasAttendees: event.Event_Guests.length > 0
      },
      options: {
        cancel: {
          action: 'cancel_event',
          label: 'Cancel this event',
          requiresEmail: event.Event_Guests.length > 0,
          description: 'Remove this event from your calendar'
        },
        differentDay: {
          action: 'move_different_day',
          label: 'Move to a different day',
          requiresEmail: event.Event_Guests.length > 0,
          bestDays: bestDays,
          allowManualDate: true
        },
        sameDay: {
          action: 'move_same_day',
          label: 'Keep today but different time',
          requiresEmail: event.Event_Guests.length > 0,
          availableSlots: sameDaySlots,
          allowManualTime: true
        }
      }
    });

  } catch (error) {
    console.error('Get broad options error:', error);
    res.status(500).json({ error: 'Failed to get options', details: error.message });
  }
});

// @route   POST /api/reschedule-decision/cancel-event
// @desc    Cancel an event (with email notification if has attendees)
// @access  Private
router.post('/cancel-event', async (req, res) => {
  const { email, eventId, reason = '' } = req.body;

  if (!email || !eventId) {
    return res.status(400).json({ error: 'Email and event ID required' });
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

    const hasAttendees = event.Event_Guests.length > 0;

    // Delete from Google Calendar (which sends notifications to attendees automatically)
    await deleteCalendarEvent(user.OAuth_Token, event.GCal_Event_ID);

    // Delete from database
    await Event.deleteOne({ ID: eventId });

    res.json({
      success: true,
      message: hasAttendees 
        ? 'Event canceled and attendees notified via Google Calendar'
        : 'Event canceled',
      event: {
        id: event.ID,
        name: event.Event_Name
      }
    });

  } catch (error) {
    console.error('Cancel event error:', error);
    res.status(500).json({ error: 'Failed to cancel event', details: error.message });
  }
});

// @route   POST /api/reschedule-decision/move-manual
// @desc    Move event to manually specified time
// @access  Private
router.post('/move-manual', async (req, res) => {
  const { email, eventId, newTimeSlot, userApproved = false } = req.body;

  if (!email || !eventId || !newTimeSlot) {
    return res.status(400).json({ error: 'Email, event ID, and new time slot required' });
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

    const hasAttendees = event.Event_Guests.length > 0;

    // If has attendees and user hasn't confirmed they want to send emails, ask for approval
    if (hasAttendees && !userApproved) {
      return res.json({
        success: false,
        requiresApproval: true,
        message: 'This event has attendees. Rescheduling will notify them.',
        event: {
          id: event.ID,
          name: event.Event_Name,
          attendees: event.Event_Guests
        },
        proposedTime: newTimeSlot
      });
    }

    // Update in Google Calendar (automatically notifies attendees)
    const calendarUpdate = await updateCalendarEvent(
      user.OAuth_Token,
      event.GCal_Event_ID,
      {
        start: {
          dateTime: new Date(newTimeSlot.startDateTime).toISOString(),
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: new Date(newTimeSlot.endDateTime).toISOString(),
          timeZone: 'America/New_York'
        }
      }
    );

    if (!calendarUpdate.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update Google Calendar'
      });
    }

    // Update in database
    event.Event_Start_Date = new Date(newTimeSlot.startDateTime);
    event.Event_End_Date = new Date(newTimeSlot.endDateTime);
    event.Start_Time = new Date(newTimeSlot.startDateTime).toTimeString().substr(0, 5);
    event.End_Time = new Date(newTimeSlot.endDateTime).toTimeString().substr(0, 5);
    await event.save();

    res.json({
      success: true,
      message: hasAttendees 
        ? 'Event rescheduled and attendees notified via Google Calendar'
        : 'Event rescheduled',
      event: {
        id: event.ID,
        name: event.Event_Name,
        newStart: event.Event_Start_Date,
        newEnd: event.Event_End_Date
      }
    });

  } catch (error) {
    console.error('Manual move error:', error);
    res.status(500).json({ error: 'Failed to move event', details: error.message });
  }
});

module.exports = router;

