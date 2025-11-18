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
const { compareEventImportance, compareEventFlexibility } = require('../services/conflictDetector');

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
    let aiComparison;
    try {
      aiComparison = await compareEventPriorityWithAI(newEventData, conflictingEvent);
      
      // Validate AI comparison result
      if (!aiComparison || typeof aiComparison.higherPriorityEvent === 'undefined') {
        console.warn('⚠️ AI comparison returned invalid result, using fallback');
        throw new Error('Invalid AI comparison result');
      }
    } catch (aiError) {
      console.error('❌ AI comparison failed, using fallback:', aiError);
      // Fallback: use heuristic comparison with tie-breakers (flexibility, attendees)
      const importance = compareEventImportance(newEventData, conflictingEvent);
      let higherPriorityEvent;
      if (importance === 1) {
        higherPriorityEvent = 1; // new event higher
      } else if (importance === 2) {
        higherPriorityEvent = 2; // existing event higher
      } else {
        // Equal importance → tie-break using flexibility (less flexible wins)
        const flexibility = compareEventFlexibility(newEventData, conflictingEvent);
        if (flexibility === 1) {
          // new is more flexible → existing is effectively higher priority to keep
          higherPriorityEvent = 2;
        } else if (flexibility === 2) {
          // existing is more flexible → new is effectively higher priority to keep
          higherPriorityEvent = 1;
        } else {
          // Still equal → prefer keeping event with attendees (harder to move)
          const newHasAttendees = (newEventData.attendees || newEventData.Event_Guests || []).length > 0;
          const existingHasAttendees = (conflictingEvent.Event_Guests || []).length > 0;
          if (existingHasAttendees && !newHasAttendees) {
            higherPriorityEvent = 2;
          } else if (newHasAttendees && !existingHasAttendees) {
            higherPriorityEvent = 1;
          } else {
            // Final tie → prefer not disrupting existing event
            higherPriorityEvent = 2;
          }
        }
      }
      aiComparison = {
        higherPriorityEvent,
        reason: 'Using heuristic comparison (AI unavailable)',
        confidenceLevel: 'medium'
      };
    }

    // Normalize higherPriorityEvent in case AI returns string labels
    // Map: 'new' => 1, 'existing' => 2
    const normalizedHigherPriority =
      typeof aiComparison.higherPriorityEvent === 'string'
        ? (aiComparison.higherPriorityEvent === 'new' ? 1 : 2)
        : aiComparison.higherPriorityEvent;

    // If normalized result is invalid or 0 (equal), fall back to heuristic to decide
    let finalHigherPriority = normalizedHigherPriority;
    if (!finalHigherPriority || (finalHigherPriority !== 1 && finalHigherPriority !== 2)) {
      const importance = compareEventImportance(newEventData, conflictingEvent);
      if (importance === 1) finalHigherPriority = 1;
      else if (importance === 2) finalHigherPriority = 2;
      else {
        const flexibility = compareEventFlexibility(newEventData, conflictingEvent);
        if (flexibility === 1) finalHigherPriority = 2; // keep existing
        else if (flexibility === 2) finalHigherPriority = 1; // keep new
        else {
          const newHasAttendees = (newEventData.attendees || newEventData.Event_Guests || []).length > 0;
          const existingHasAttendees = (conflictingEvent.Event_Guests || []).length > 0;
          if (existingHasAttendees && !newHasAttendees) finalHigherPriority = 2;
          else if (newHasAttendees && !existingHasAttendees) finalHigherPriority = 1;
          else finalHigherPriority = 2; // prefer not disrupting existing
        }
      }
    }

    // CRITICAL: Check flexibility constraints - Rigid and Passive events CANNOT be moved
    const newEventFlexibility = newEventData.flexibility || newEventData.Event_Flexibility || 'Busy';
    const conflictingEventFlexibility = conflictingEvent.Event_Flexibility || 'Busy';
    
    const newEventIsImmutable = newEventFlexibility === 'Rigid' || newEventFlexibility === 'Passive';
    const conflictingEventIsImmutable = conflictingEventFlexibility === 'Rigid' || conflictingEventFlexibility === 'Passive';
    
    let shouldMoveNewEvent;
    let flexibilityReason = null; // Will contain explanation if flexibility is the deciding factor
    
    if (newEventIsImmutable && conflictingEventIsImmutable) {
      // Both events are Rigid/Passive - this is a hard conflict
      // In this case, we cannot resolve it automatically - the new event cannot be created
      return res.status(409).json({
        success: false,
        error: 'Cannot resolve conflict: Both events are Rigid or Passive and cannot be moved',
        hasConflicts: true,
        conflicts: [{
          conflictingEvent: {
            id: conflictingEvent.ID,
            name: conflictingEvent.Event_Name,
            start: conflictingEvent.Event_Start_Date,
            end: conflictingEvent.Event_End_Date,
            flexibility: conflictingEventFlexibility
          }
        }]
      });
    } else if (newEventIsImmutable) {
      // New event is Rigid/Passive - it cannot be moved, so move the conflicting event
      console.log(`🔒 New event is ${newEventFlexibility} - cannot be moved. Moving conflicting event instead.`);
      shouldMoveNewEvent = false; // Move the conflicting event
      flexibilityReason = `The new event "${newEventData.title || newEventData.Event_Name}" is marked as ${newEventFlexibility}, which means it cannot be moved or rescheduled. Therefore, we'll move "${conflictingEvent.Event_Name}" (${conflictingEventFlexibility}) to resolve the conflict.`;
    } else if (conflictingEventIsImmutable) {
      // Conflicting event is Rigid/Passive - it cannot be moved, so move the new event
      console.log(`🔒 Conflicting event is ${conflictingEventFlexibility} - cannot be moved. Moving new event instead.`);
      shouldMoveNewEvent = true; // Move the new event
      flexibilityReason = `The existing event "${conflictingEvent.Event_Name}" is marked as ${conflictingEventFlexibility}, which means it cannot be moved or rescheduled. Therefore, we'll move your new event "${newEventData.title || newEventData.Event_Name}" (${newEventFlexibility}) to resolve the conflict.`;
    } else {
      // Neither event is Rigid/Passive - use AI priority to decide
      // IMPORTANT: Always move the LOWER priority event
      // If new event is higher priority (1), move the existing event
      // If existing event is higher priority (2), move the new event
      shouldMoveNewEvent = finalHigherPriority === 2; // Existing event is higher priority
      console.log(`🎯 AI Decision: ${shouldMoveNewEvent ? 'Move NEW event' : 'Move EXISTING event'} (based on priority)`);
      // Use the original AI reason since flexibility wasn't the deciding factor
      flexibilityReason = aiComparison.reason;
    }
    
    const eventToMove = shouldMoveNewEvent ? newEventData : conflictingEvent;
    const eventToKeep = shouldMoveNewEvent ? conflictingEvent : newEventData;

    console.log(`📌 Event to move: ${eventToMove.Event_Name || eventToMove.title} (${newEventIsImmutable ? newEventFlexibility : conflictingEventIsImmutable ? conflictingEventFlexibility : 'flexible'})`);
    console.log(`📌 Event to keep: ${eventToKeep.Event_Name || eventToKeep.title} (${shouldMoveNewEvent ? conflictingEventFlexibility : newEventFlexibility})`);

    // Validate event data
    if (!eventToMove) {
      throw new Error('Event to move is undefined');
    }
    
    const eventToMoveStart = eventToMove.startDateTime || eventToMove.Event_Start_Date;
    const eventToMoveEnd = eventToMove.endDateTime || eventToMove.Event_End_Date;
    
    if (!eventToMoveStart || !eventToMoveEnd) {
      throw new Error(`Missing start or end time for event to move. Start: ${eventToMoveStart}, End: ${eventToMoveEnd}`);
    }

    // Check if events have attendees
    const hasAttendees = (eventToMove.attendees || eventToMove.Event_Guests || []).length > 0;

    // Find best same-day slot
    const duration = calculateEventDuration(eventToMoveStart, eventToMoveEnd);

    // IMPORTANT: Get events from Google Calendar (source of truth)
    // Then enrich with metadata from MongoDB
    const eventDate = new Date(eventToMoveStart);
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
      // IMPORTANT: Include the conflicting event in the list for conflict checking
      allEvents = await Event.find({
        User_Email: email
        // Don't exclude conflictingEventId - we need it for conflict checking
      });
      
      // Convert MongoDB events to the format expected by conflict checking
      allEvents = allEvents.map(event => ({
        Event_Start_Date: event.Event_Start_Date,
        Event_End_Date: event.Event_End_Date,
        Event_Name: event.Event_Name,
        Event_Priority: event.Event_Priority || 2,
        Event_Flexibility: event.Event_Flexibility || 'Busy',
        Event_Type: event.Event_Type || 'other',
        Event_Guests: event.Event_Guests || [],
        GCal_Event_ID: event.GCal_Event_ID,
        ID: event.ID
      }));
      
      console.log(`📋 Found ${allEvents.length} events from MongoDB (including conflicting event)`);
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
      // IMPORTANT: Keep ALL events in the list initially (including conflicting event)
      // We'll filter out the event being moved later, but we need to check conflicts against all events
      allEvents = calendarResult.events
        .map(gcalEvent => {
          const dbEvent = dbEventMap.get(gcalEvent.id);

          // Handle all-day events properly
          let startDate, endDate;
          if (gcalEvent.start.date) {
            // All-day event
            startDate = new Date(gcalEvent.start.date);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(gcalEvent.end.date);
            endDate.setHours(0, 0, 0, 0);
          } else {
            // Timed event
            startDate = new Date(gcalEvent.start.dateTime);
            endDate = new Date(gcalEvent.end.dateTime);
          }
          const spansDifferentDay = startDate.toDateString() !== endDate.toDateString();

          const enrichedEvent = {
            Event_Start_Date: startDate,
            Event_End_Date: endDate,
            Event_Name: gcalEvent.summary || 'Untitled Event',
            Event_Priority: dbEvent?.Event_Priority || 2,
            Event_Flexibility: dbEvent?.Event_Flexibility || 'Busy', // Default to Busy if no metadata
            Event_Type: dbEvent?.Event_Type || 'other',
            Event_Guests: gcalEvent.attendees || [],
            GCal_Event_ID: gcalEvent.id,
            ID: dbEvent?.ID,
            // Treat any all-day or cross-day event as ignorable in conflict checks
            isAllDay: !!gcalEvent.start.date || spansDifferentDay
          };

          const timeDisplay = gcalEvent.start.date ? 'All Day' : enrichedEvent.Event_Start_Date.toLocaleTimeString();
          console.log(`  📌 ${enrichedEvent.Event_Name} @ ${timeDisplay} - ${enrichedEvent.Event_Flexibility}`);

          return enrichedEvent;
        });

      console.log(`📋 Total events for slot finding: ${allEvents.length}`);
    }
    
    // IMPORTANT: Make sure the conflicting event is in the list with its metadata
    // (if we're moving the new event, we need to check conflicts against the conflicting event)
    // This applies to both Google Calendar and MongoDB fallback cases
    if (shouldMoveNewEvent) {
      const conflictingEventInList = allEvents.find(evt => 
        evt.GCal_Event_ID === conflictingEvent.GCal_Event_ID || 
        evt.ID === conflictingEvent.ID
      );
      if (!conflictingEventInList) {
        // Add the conflicting event to the list for conflict checking
        allEvents.push({
          Event_Start_Date: new Date(conflictingEvent.Event_Start_Date),
          Event_End_Date: new Date(conflictingEvent.Event_End_Date),
          Event_Name: conflictingEvent.Event_Name || 'Conflicting Event',
          Event_Priority: conflictingEvent.Event_Priority || 2,
          Event_Flexibility: conflictingEvent.Event_Flexibility || 'Busy',
          Event_Type: conflictingEvent.Event_Type || 'other',
          Event_Guests: conflictingEvent.Event_Guests || [],
          GCal_Event_ID: conflictingEvent.GCal_Event_ID,
          ID: conflictingEvent.ID
        });
        console.log(`➕ Added conflicting event to list for conflict checking: ${conflictingEvent.Event_Name}`);
      } else {
        console.log(`✅ Conflicting event already in list: ${conflictingEvent.Event_Name}`);
      }
    }

    // IMPORTANT: When finding slots, exclude the time where the event-being-moved currently exists
    // Otherwise it will suggest moving it to the same time it's already at!
    const eventToMoveStartTime = new Date(eventToMoveStart);
    const eventToMoveEndTime = new Date(eventToMoveEnd);
    
    console.log(`⏰ Event to move current time: ${eventToMoveStartTime.toLocaleTimeString()} - ${eventToMoveEndTime.toLocaleTimeString()}`);
    
    // Filter out the event being moved from the events list
    // So we can find slots that don't include its current time
    // BUT: Keep the conflicting event in the list if we're moving the NEW event (need to check conflicts against it)
    const eventsExcludingMovingEvent = allEvents.filter(evt => {
      // If moving existing event, exclude it by GCal_Event_ID
      if (!shouldMoveNewEvent && evt.GCal_Event_ID === conflictingEvent.GCal_Event_ID) {
        console.log(`🔹 Excluding event being moved: ${evt.Event_Name}`);
        return false;
      }
      // If moving new event, keep the conflicting event in the list for conflict checking
      // (unless it's Passive/Flexible, which will be handled by hasConflict function)
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
    
    // VALIDATION: Make sure the suggested slot is valid
    if (sameDayBestSlot) {
      const suggestedStart = new Date(sameDayBestSlot.startDateTime);
      const suggestedEnd = new Date(sameDayBestSlot.endDateTime);
      
      // Check 1: Not the same as current time
      if (suggestedStart.getTime() === eventToMoveStartTime.getTime() && 
          suggestedEnd.getTime() === eventToMoveEndTime.getTime()) {
        console.error('❌ ERROR: Suggested slot is the same as current time! This should not happen.');
        sameDayBestSlot = null;
      }
      
      // Check 2: Verify it doesn't conflict with Rigid/Busy events (double-check)
      if (sameDayBestSlot) {
        for (const event of eventsExcludingMovingEvent) {
          // Ignore all-day events in double-check
          if (event.isAllDay) continue;
          const eventStart = new Date(event.Event_Start_Date);
          const eventEnd = new Date(event.Event_End_Date);
          
          // Check for overlap
          if (suggestedStart < eventEnd && suggestedEnd > eventStart) {
            const flexibility = event.Event_Flexibility || 'Busy';
            // Only Rigid and Busy are conflicts
            if (flexibility !== 'Passive' && flexibility !== 'Flexible') {
              console.error(`❌ ERROR: Suggested slot conflicts with ${flexibility} event: ${event.Event_Name}`);
              console.error(`   Slot: ${suggestedStart.toLocaleTimeString()} - ${suggestedEnd.toLocaleTimeString()}`);
              console.error(`   Event: ${eventStart.toLocaleTimeString()} - ${eventEnd.toLocaleTimeString()}`);
              sameDayBestSlot = null;
              break;
            }
          }
        }
      }
    }

    // PRD: Find alternative days (top 3) with suggested times
    // Only dates AFTER the original date (not before)
    // IMPORTANT: For different days, we need to fetch events for the entire search range (14 days)
    // to properly check for conflicts on those days
    const originalDate = new Date(eventToMoveStartTime);
    const searchEndDate = new Date(originalDate);
    searchEndDate.setDate(searchEndDate.getDate() + 14); // Search next 14 days
    
    console.log(`📅 Fetching events for different day search: ${originalDate.toDateString()} to ${searchEndDate.toDateString()}`);
    
    // Fetch events from Google Calendar for the entire search range
    const multiDayCalendarResult = await getCalendarEvents(
      user.OAuth_Token,
      originalDate.toISOString(),
      searchEndDate.toISOString()
    );
    
    let allEventsForMultiDay = [];
    
    if (multiDayCalendarResult.success) {
      console.log(`✅ Found ${multiDayCalendarResult.events.length} events in Google Calendar for multi-day search`);
      
      // Get GCal event IDs
      const gcalEventIds = multiDayCalendarResult.events.map(e => e.id).filter(id => id);
      
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
      
      // Enrich Google Calendar events with MongoDB metadata
      allEventsForMultiDay = multiDayCalendarResult.events
        .filter(gcalEvent => {
          // Exclude the event being moved
          if (!shouldMoveNewEvent && gcalEvent.id === conflictingEvent.GCal_Event_ID) {
            return false;
          }
          return true;
        })
        .map(gcalEvent => {
          const dbEvent = dbEventMap.get(gcalEvent.id);
          
          // Handle all-day events properly
          let startDate, endDate;
          if (gcalEvent.start.date) {
            // All-day event
            startDate = new Date(gcalEvent.start.date);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(gcalEvent.end.date);
            endDate.setHours(0, 0, 0, 0);
          } else {
            // Timed event
            startDate = new Date(gcalEvent.start.dateTime);
            endDate = new Date(gcalEvent.end.dateTime);
          }
          
          return {
            Event_Start_Date: startDate,
            Event_End_Date: endDate,
            Event_Name: gcalEvent.summary || 'Untitled Event',
            Event_Priority: dbEvent?.Event_Priority || 2,
            Event_Flexibility: dbEvent?.Event_Flexibility || 'Busy',
            Event_Type: dbEvent?.Event_Type || 'other',
            Event_Guests: gcalEvent.attendees || [],
            GCal_Event_ID: gcalEvent.id,
            ID: dbEvent?.ID,
            isAllDay: !!gcalEvent.start.date
          };
        });
      
      console.log(`📋 Using ${allEventsForMultiDay.length} events for multi-day conflict checking`);
    } else {
      console.warn('⚠️ Failed to fetch calendar events for multi-day search, using same-day events');
      // Fallback: use same-day events (not ideal, but better than nothing)
      allEventsForMultiDay = eventsExcludingMovingEvent;
    }
    
    const bestDays = findBestDaysForRescheduling(
      duration,
      allEventsForMultiDay, // Use events from entire search range
      { Work_Hours: {}, Bedtime: {}, No_Meeting_Zones: [], Preferred_Meeting_Windows: [] },
      14, // Search next 14 days
      originalDate // Only show dates >= original date
    );

    console.log(`📅 Found ${bestDays.length} alternative days with suggested times`);

    // PRD: Return THREE options directly:
    // 1. Move to different suggested time (same day) - if available
    // 2. Move to different day during a different suggested time
    // 3. Cancel the event
    res.json({
      success: true,
      analysis: {
        aiPriorityComparison: {
          higherPriorityEvent: shouldMoveNewEvent ? 'existing' : 'new',
          reason: flexibilityReason || aiComparison.reason, // Use flexibility reason if available, otherwise use AI reason
          confidenceLevel: (newEventIsImmutable || conflictingEventIsImmutable) ? 'high' : aiComparison.confidenceLevel, // High confidence when flexibility is the deciding factor
          decidedByFlexibility: newEventIsImmutable || conflictingEventIsImmutable // Flag to indicate if flexibility was the deciding factor
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
        // Include the best same-day slot so the frontend can act on it
        sameDayBestSlot: sameDayBestSlot
      },
      // PRD: Three options to show user
      options: {
        // Option 1: Move to suggested time (same day) - if available
        moveToSuggestedTime: sameDayBestSlot ? {
          available: true,
          slot: sameDayBestSlot,
          label: `Move to ${sameDayBestSlot.startTime} - ${sameDayBestSlot.endTime}`,
          description: sameDayBestSlot.reason || 'Available time slot',
          requiresEmail: hasAttendees
        } : {
          available: false,
          reason: 'No available same-day slots found'
        },
        // Option 2: Move to different day with suggested times
        moveToDifferentDay: {
          available: bestDays.length > 0,
          bestDays: bestDays,
          label: 'Move to a different day',
          description: `Found ${bestDays.length} day(s) with available time slots`,
          requiresEmail: hasAttendees
        },
        // Option 3: Cancel the event
        cancel: {
          available: true,
          label: 'Cancel this event',
          description: 'Remove this event from your calendar',
          requiresEmail: hasAttendees
        }
      }
    });

  } catch (error) {
    console.error('❌ Analyze conflict error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      email: email,
      conflictingEventId: conflictingEventId,
      newEventData: newEventData ? {
        title: newEventData.title || newEventData.Event_Name,
        startDateTime: newEventData.startDateTime || newEventData.Event_Start_Date,
        endDateTime: newEventData.endDateTime || newEventData.Event_End_Date
      } : null
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze conflict', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    
    // Get all events from Google Calendar (source of truth) for the search period
    // Search from original event date to 14 days ahead
    const originalDate = new Date(event.Event_Start_Date);
    const searchStart = new Date(originalDate);
    searchStart.setHours(0, 0, 0, 0);
    const searchEnd = new Date(originalDate);
    searchEnd.setDate(searchEnd.getDate() + 14);
    searchEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Fetching events from Google Calendar from ${searchStart.toDateString()} to ${searchEnd.toDateString()}`);
    
    const calendarResult = await getCalendarEvents(
      user.OAuth_Token,
      searchStart.toISOString(),
      searchEnd.toISOString()
    );

    let allEvents = [];
    
    if (calendarResult.success) {
      console.log(`✅ Found ${calendarResult.events.length} events in Google Calendar`);
      
      const gcalEventIds = calendarResult.events.map(e => e.id).filter(id => id);
      const dbEvents = await Event.find({
        User_Email: email,
        GCal_Event_ID: { $in: gcalEventIds }
      });

      const dbEventMap = new Map();
      dbEvents.forEach(e => {
        if (e.GCal_Event_ID) {
          dbEventMap.set(e.GCal_Event_ID, e);
        }
      });

      // Enrich Google Calendar events with MongoDB metadata
      allEvents = calendarResult.events
        .filter(gcalEvent => {
          // Exclude the event being rescheduled
          if (gcalEvent.id === event.GCal_Event_ID) {
            return false;
          }
          return true;
        })
        .map(gcalEvent => {
          const dbEvent = dbEventMap.get(gcalEvent.id);
          
          // Handle all-day and timed events
          let startDate, endDate;
          if (gcalEvent.start.date) {
            startDate = new Date(gcalEvent.start.date);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(gcalEvent.end.date);
            endDate.setHours(0, 0, 0, 0);
          } else {
            startDate = new Date(gcalEvent.start.dateTime);
            endDate = new Date(gcalEvent.end.dateTime);
          }
          const spansDifferentDay = startDate.toDateString() !== endDate.toDateString();
          
          return {
            Event_Start_Date: startDate,
            Event_End_Date: endDate,
            Event_Name: gcalEvent.summary || 'Untitled Event',
            Event_Priority: dbEvent?.Event_Priority || 2,
            Event_Flexibility: dbEvent?.Event_Flexibility || 'Busy', // Default to Busy if no metadata
            Event_Type: dbEvent?.Event_Type || 'other',
            Event_Guests: gcalEvent.attendees || [],
            GCal_Event_ID: gcalEvent.id,
            ID: dbEvent?.ID,
            isAllDay: !!gcalEvent.start.date || spansDifferentDay
          };
        });
    } else {
      // Fallback to MongoDB if Calendar API fails
      console.warn('⚠️ Failed to fetch from Google Calendar, falling back to MongoDB');
      allEvents = await Event.find({
        User_Email: email,
        ID: { $ne: eventId }
      }).lean();
      // Mark DB all-day/multi-day events best-effort
      allEvents = allEvents.map(e => {
        const start = new Date(e.Event_Start_Date);
        const end = new Date(e.Event_End_Date);
        const durationHours = (end - start) / (1000 * 60 * 60);
        const isMidnightStart = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0;
        const spansDifferentDay = start.toDateString() !== end.toDateString();
        const isAllDay = spansDifferentDay || (durationHours >= 23 && durationHours <= 25) || isMidnightStart;
        return { ...e, isAllDay };
      });
    }

    console.log(`📋 Using ${allEvents.length} events for slot finding (excluding event being rescheduled)`);
    
    const bestDays = findBestDaysForRescheduling(
      duration,
      allEvents,
      { 
        Work_Hours: user.Work_Hours || {}, 
        Bedtime: user.Bedtime || {}, 
        No_Meeting_Zones: user.No_Meeting_Zones || [], 
        Preferred_Meeting_Windows: user.Preferred_Meeting_Windows || [] 
      },
      14, // Search next 14 days
      originalDate // Only show dates >= original date
    );
    
    console.log(`📅 Best alternative days (all >= ${originalDate.toDateString()}):`, bestDays.map(d => d.date));

    // Get same-day alternatives (2-3 slots)
    const sameDaySlots = findAvailableTimeSlots(
      duration,
      event.Event_Start_Date,
      allEvents,
      { 
        Work_Hours: user.Work_Hours || {}, 
        Bedtime: user.Bedtime || {}, 
        No_Meeting_Zones: user.No_Meeting_Zones || [], 
        Preferred_Meeting_Windows: user.Preferred_Meeting_Windows || [] 
      },
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
  const { email, eventId, newTimeSlot, userApproved = false, updateTitleToTentative = false } = req.body;

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

    // Validate the proposed new time does not conflict with Busy/Rigid events (allow Passive/Flexible)
    const proposedStart = new Date(newTimeSlot.startDateTime);
    const proposedEnd = new Date(newTimeSlot.endDateTime);

    // Fetch all events for the day of the proposed time (Google Calendar, enriched with DB)
    const dayStart = new Date(proposedStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(proposedStart);
    dayEnd.setHours(23, 59, 59, 999);

    const calendarResult = await getCalendarEvents(
      user.OAuth_Token,
      dayStart.toISOString(),
      dayEnd.toISOString()
    );

    let eventsForDay = [];
    if (calendarResult.success) {
      const gcalEventIds = calendarResult.events.map(e => e.id).filter(id => id);
      const dbEvents = await Event.find({
        User_Email: email,
        GCal_Event_ID: { $in: gcalEventIds }
      });
      const dbEventMap = new Map();
      dbEvents.forEach(e => {
        if (e.GCal_Event_ID) {
          dbEventMap.set(e.GCal_Event_ID, e);
        }
      });

      eventsForDay = calendarResult.events.map(gcalEvent => {
        // Handle all-day and timed events
        let startDate, endDate;
        if (gcalEvent.start.date) {
          startDate = new Date(gcalEvent.start.date);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(gcalEvent.end.date);
          endDate.setHours(0, 0, 0, 0);
        } else {
          startDate = new Date(gcalEvent.start.dateTime);
          endDate = new Date(gcalEvent.end.dateTime);
        }
        const spansDifferentDay = startDate.toDateString() !== endDate.toDateString();
        const dbEvent = dbEventMap.get(gcalEvent.id);
        return {
          Event_Start_Date: startDate,
          Event_End_Date: endDate,
          Event_Name: gcalEvent.summary || dbEvent?.Event_Name || 'Untitled Event',
          Event_Priority: dbEvent?.Event_Priority || 2,
          Event_Flexibility: dbEvent?.Event_Flexibility || 'Busy',
          Event_Type: dbEvent?.Event_Type || 'other',
          Event_Guests: gcalEvent.attendees || dbEvent?.Event_Guests || [],
          GCal_Event_ID: gcalEvent.id,
          ID: dbEvent?.ID,
          isAllDay: !!gcalEvent.start.date || spansDifferentDay
        };
      });
    } else {
      // Fallback to DB query for that day
      eventsForDay = await Event.find({
        User_Email: email,
        Event_Start_Date: { $gte: dayStart, $lte: dayEnd }
      }).lean();
      // Mark DB all-day/multi-day events best-effort: any cross-day, ~24h duration, or midnight start
      eventsForDay = eventsForDay.map(e => {
        const start = new Date(e.Event_Start_Date);
        const end = new Date(e.Event_End_Date);
        const durationHours = (end - start) / (1000 * 60 * 60);
        const isMidnightStart = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0;
        const spansDifferentDay = start.toDateString() !== end.toDateString();
        const isAllDay = spansDifferentDay || (durationHours >= 23 && durationHours <= 25) || isMidnightStart;
        return { ...e, isAllDay };
      });
    }

    // Check for conflicts against Busy/Rigid events (exclude the event being moved)
    for (const other of eventsForDay) {
      // Ignore all-day events in validation
      if (other.isAllDay) continue;
      // Skip the same event (match by GCal ID or internal ID)
      if (
        (other.GCal_Event_ID && event.GCal_Event_ID && other.GCal_Event_ID === event.GCal_Event_ID) ||
        (other.ID && event.ID && other.ID === event.ID)
      ) {
        continue;
      }

      const otherStart = new Date(other.Event_Start_Date);
      const otherEnd = new Date(other.Event_End_Date);
      const overlaps = proposedStart < otherEnd && proposedEnd > otherStart;
      if (!overlaps) continue;

      const otherFlex = other.Event_Flexibility || 'Busy';
      const canOverlap = otherFlex === 'Passive' || otherFlex === 'Flexible';
      if (!canOverlap) {
        return res.status(409).json({
          success: false,
          error: `Proposed time conflicts with ${otherFlex} event: ${other.Event_Name}`,
          conflictingEvent: {
            id: other.ID,
            name: other.Event_Name,
            start: other.Event_Start_Date,
            end: other.Event_End_Date,
            flexibility: otherFlex
          }
        });
      }
    }

    // Prepare calendar update payload
    const calendarUpdates = {
      start: {
        dateTime: new Date(newTimeSlot.startDateTime).toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: new Date(newTimeSlot.endDateTime).toISOString(),
        timeZone: 'America/New_York'
      }
    };

    // If event has attendees and updateTitleToTentative is true, update title to "TENTATIVE: [original title]"
    if (updateTitleToTentative && hasAttendees) {
      const originalTitle = event.Event_Name;
      // Only add "TENTATIVE:" prefix if it doesn't already start with it
      if (!originalTitle.startsWith('TENTATIVE: ')) {
        calendarUpdates.summary = `TENTATIVE: ${originalTitle}`;
        // Also update in database
        event.Event_Name = `TENTATIVE: ${originalTitle}`;
      }
    }

    // Update in Google Calendar (automatically notifies attendees)
    const calendarUpdate = await updateCalendarEvent(
      user.OAuth_Token,
      event.GCal_Event_ID,
      calendarUpdates
    );

    if (!calendarUpdate.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update Google Calendar'
      });
    }

    // Update in database (title already updated above if needed)
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

// @route   POST /api/reschedule-decision/get-options-for-new-event
// @desc    Get decision tree options for a NEW event (not yet in database)
// @access  Private
router.post('/get-options-for-new-event', async (req, res) => {
  const { email, newEventData, conflictingEventId, isMovingNewEvent } = req.body;

  if (!email || !newEventData || !conflictingEventId) {
    return res.status(400).json({ error: 'Email, new event data, and conflicting event ID required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conflictingEvent = await Event.findOne({ ID: conflictingEventId, User_Email: email });
    if (!conflictingEvent) {
      return res.status(404).json({ error: 'Conflicting event not found' });
    }

    // Determine which event we're finding slots for
    const eventToReschedule = isMovingNewEvent ? newEventData : conflictingEvent;
    const eventDate = new Date(eventToReschedule.startDateTime || eventToReschedule.Event_Start_Date);
    const duration = newEventData.duration || calculateEventDuration(
      eventToReschedule.startDateTime || eventToReschedule.Event_Start_Date,
      eventToReschedule.endDateTime || eventToReschedule.Event_End_Date
    );

    // Get all events from Google Calendar for the day (PRD requirement)
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
    
    if (calendarResult.success) {
      console.log(`✅ Found ${calendarResult.events.length} events in Google Calendar`);
      
      const gcalEventIds = calendarResult.events.map(e => e.id).filter(id => id);
      const dbEvents = await Event.find({
        User_Email: email,
        GCal_Event_ID: { $in: gcalEventIds }
      });

      const dbEventMap = new Map();
      dbEvents.forEach(e => {
        if (e.GCal_Event_ID) {
          dbEventMap.set(e.GCal_Event_ID, e);
        }
      });

      // Enrich Google Calendar events with MongoDB metadata
      allEvents = calendarResult.events
        .filter(gcalEvent => {
          // If moving existing event, exclude it
          if (!isMovingNewEvent && gcalEvent.id === conflictingEvent.GCal_Event_ID) {
            return false;
          }
          return true;
        })
        .map(gcalEvent => {
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
    } else {
      // Fallback to MongoDB
      allEvents = await Event.find({
        User_Email: email,
        ID: { $ne: conflictingEventId }
      });
    }

    console.log(`📋 Using ${allEvents.length} events for slot finding`);

    // Get top 3 alternative days (only AFTER original date - PRD requirement)
    const originalDate = new Date(eventDate);
    const bestDays = findBestDaysForRescheduling(
      duration,
      allEvents,
      { 
        Work_Hours: user.Work_Hours || {}, 
        Bedtime: user.Bedtime || {}, 
        No_Meeting_Zones: user.No_Meeting_Zones || [], 
        Preferred_Meeting_Windows: user.Preferred_Meeting_Windows || [] 
      },
      14, // Search next 14 days
      originalDate // Only show dates >= original date
    );

    // Get same-day alternatives (2-3 slots)
    const sameDaySlots = findAvailableTimeSlots(
      duration,
      eventDate,
      allEvents,
      { 
        Work_Hours: user.Work_Hours || {}, 
        Bedtime: user.Bedtime || {}, 
        No_Meeting_Zones: user.No_Meeting_Zones || [], 
        Preferred_Meeting_Windows: user.Preferred_Meeting_Windows || [] 
      },
      { maxSlots: 3, sameDayOnly: true }
    );

    res.json({
      success: true,
      event: {
        name: newEventData.title || 'New Event',
        duration: duration,
        hasAttendees: (newEventData.attendees || []).length > 0
      },
      options: {
        cancel: {
          action: 'cancel_event',
          label: 'Cancel Event',
          description: 'Remove this event from your calendar',
          requiresEmail: (newEventData.attendees || []).length > 0
        },
        differentDay: {
          action: 'move_different_day',
          label: 'Move to Different Day',
          description: 'See best days available',
          bestDays: bestDays,
          allowManualDate: true,
          requiresEmail: (newEventData.attendees || []).length > 0
        },
        sameDay: {
          action: 'move_same_day',
          label: 'Keep Today, Different Time',
          description: 'Find another time slot today',
          availableSlots: sameDaySlots,
          allowManualTime: true,
          requiresEmail: (newEventData.attendees || []).length > 0
        }
      }
    });

  } catch (error) {
    console.error('Get options for new event error:', error);
    res.status(500).json({ error: 'Failed to get options', details: error.message });
  }
});

module.exports = router;

