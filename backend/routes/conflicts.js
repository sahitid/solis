const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const {
  findConflicts,
  generateResolutionRecommendation,
  detectCascadeConflicts,
  compareEventImportance,
  compareEventFlexibility
} = require('../services/conflictDetector');

// @route   POST /api/conflicts/check
// @desc    Check if a new event conflicts with existing events
// @access  Private
router.post('/check', async (req, res) => {
  const { email, newEvent } = req.body;

  if (!email || !newEvent) {
    return res.status(400).json({ error: 'Email and new event data are required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate new event has required fields
    if (!newEvent.startDateTime || !newEvent.endDateTime) {
      return res.status(400).json({ error: 'Event start and end times are required' });
    }

    // Get all existing events for the user in the relevant time range
    const eventStartDate = new Date(newEvent.startDateTime);
    const searchStart = new Date(eventStartDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
    const searchEnd = new Date(eventStartDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after

    const existingEvents = await Event.find({
      User_Email: email,
      Event_Start_Date: {
        $gte: searchStart,
        $lte: searchEnd
      }
    });

    // Prepare newEvent in the format expected by findConflicts
    const formattedNewEvent = {
      Event_Start_Date: newEvent.startDateTime,
      Event_End_Date: newEvent.endDateTime,
      Event_Priority: newEvent.priority || 2,
      Event_Flexibility: newEvent.flexibility || 'Busy',
      Event_Type: newEvent.category || 'other',
      Event_Guests: newEvent.attendees || [],
      Event_Name: newEvent.title || 'New Event'
    };

    // Find conflicts
    const conflicts = findConflicts(formattedNewEvent, existingEvents);

    if (conflicts.length === 0) {
      return res.json({
        success: true,
        hasConflicts: false,
        message: 'No conflicts found. Safe to create event.',
        conflicts: []
      });
    }

    // Generate recommendations for each conflict
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
        category: conflict.conflictingEvent.Event_Type,
        attendees: conflict.conflictingEvent.Event_Guests,
        gcalEventId: conflict.conflictingEvent.GCal_Event_ID
      }
    }));

    res.json({
      success: true,
      hasConflicts: true,
      conflictCount: conflicts.length,
      message: `Found ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''}`,
      conflicts: conflictsWithRecommendations,
      newEvent: formattedNewEvent
    });

  } catch (error) {
    console.error('Conflict check error:', error);
    res.status(500).json({ error: 'Failed to check conflicts', details: error.message });
  }
});

// @route   POST /api/conflicts/check-cascade
// @desc    Check if moving an event to a new time creates new conflicts
// @access  Private
router.post('/check-cascade', async (req, res) => {
  const { email, eventId, newTimeSlot } = req.body;

  if (!email || !eventId || !newTimeSlot) {
    return res.status(400).json({ error: 'Email, event ID, and new time slot are required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the event to move
    const eventToMove = await Event.findOne({ ID: eventId, User_Email: email });
    if (!eventToMove) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get all other events
    const searchStart = new Date(newTimeSlot.startDateTime);
    searchStart.setDate(searchStart.getDate() - 1); // 1 day before
    const searchEnd = new Date(newTimeSlot.endDateTime);
    searchEnd.setDate(searchEnd.getDate() + 1); // 1 day after

    const allEvents = await Event.find({
      User_Email: email,
      ID: { $ne: eventId }, // Exclude the event being moved
      Event_Start_Date: {
        $gte: searchStart,
        $lte: searchEnd
      }
    });

    // Check for cascade conflicts
    const cascadeConflicts = detectCascadeConflicts(eventToMove, newTimeSlot, allEvents);

    if (cascadeConflicts.length === 0) {
      return res.json({
        success: true,
        hasCascadeConflicts: false,
        message: 'No cascade conflicts. Safe to move event.',
        conflicts: []
      });
    }

    // Generate recommendations for cascade conflicts
    const conflictsWithRecommendations = cascadeConflicts.map(conflict => ({
      ...conflict,
      recommendation: generateResolutionRecommendation(conflict),
      conflictingEvent: {
        id: conflict.conflictingEvent.ID,
        name: conflict.conflictingEvent.Event_Name,
        startDate: conflict.conflictingEvent.Event_Start_Date,
        endDate: conflict.conflictingEvent.Event_End_Date,
        priority: conflict.conflictingEvent.Event_Priority,
        flexibility: conflict.conflictingEvent.Event_Flexibility,
        attendees: conflict.conflictingEvent.Event_Guests
      }
    }));

    res.json({
      success: true,
      hasCascadeConflicts: true,
      conflictCount: cascadeConflicts.length,
      message: `Moving this event would create ${cascadeConflicts.length} new conflict${cascadeConflicts.length > 1 ? 's' : ''}`,
      conflicts: conflictsWithRecommendations,
      eventToMove: {
        id: eventToMove.ID,
        name: eventToMove.Event_Name,
        currentStart: eventToMove.Event_Start_Date,
        currentEnd: eventToMove.Event_End_Date,
        proposedStart: newTimeSlot.startDateTime,
        proposedEnd: newTimeSlot.endDateTime
      }
    });

  } catch (error) {
    console.error('Cascade conflict check error:', error);
    res.status(500).json({ error: 'Failed to check cascade conflicts', details: error.message });
  }
});

// @route   POST /api/conflicts/compare
// @desc    Compare two events to determine which is more important/flexible
// @access  Private
router.post('/compare', async (req, res) => {
  const { email, event1Id, event2Id } = req.body;

  if (!email || !event1Id || !event2Id) {
    return res.status(400).json({ error: 'Email and both event IDs are required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const event1 = await Event.findOne({ ID: event1Id, User_Email: email });
    const event2 = await Event.findOne({ ID: event2Id, User_Email: email });

    if (!event1 || !event2) {
      return res.status(404).json({ error: 'One or both events not found' });
    }

    const importanceComparison = compareEventImportance(event1, event2);
    const flexibilityComparison = compareEventFlexibility(event1, event2);

    res.json({
      success: true,
      comparison: {
        event1: {
          id: event1.ID,
          name: event1.Event_Name,
          priority: event1.Event_Priority,
          flexibility: event1.Event_Flexibility,
          attendees: event1.Event_Guests.length
        },
        event2: {
          id: event2.ID,
          name: event2.Event_Name,
          priority: event2.Event_Priority,
          flexibility: event2.Event_Flexibility,
          attendees: event2.Event_Guests.length
        },
        moreImportant: importanceComparison === 1 ? 'event1' : 
                       importanceComparison === 2 ? 'event2' : 'equal',
        moreFlexible: flexibilityComparison === 1 ? 'event1' :
                      flexibilityComparison === 2 ? 'event2' : 'equal',
        recommendation: importanceComparison === 1 
          ? 'Event 1 should take priority'
          : importanceComparison === 2
          ? 'Event 2 should take priority'
          : flexibilityComparison === 1
          ? 'Consider moving Event 2 since Event 1 is more flexible'
          : flexibilityComparison === 2
          ? 'Consider moving Event 1 since Event 2 is more flexible'
          : 'Both events are equally important and flexible'
      }
    });

  } catch (error) {
    console.error('Event comparison error:', error);
    res.status(500).json({ error: 'Failed to compare events', details: error.message });
  }
});

// @route   GET /api/conflicts/summary/:email
// @desc    Get a summary of all conflicts in user's calendar
// @access  Private
router.get('/summary/:email', async (req, res) => {
  const { email } = req.params;
  const { days = 30 } = req.query; // Default to next 30 days

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all future events
    const now = new Date();
    const futureDate = new Date(now.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

    const events = await Event.find({
      User_Email: email,
      Event_Start_Date: {
        $gte: now,
        $lte: futureDate
      }
    }).sort({ Event_Start_Date: 1 });

    // Check each event against all others to find conflicts
    const allConflicts = [];
    const conflictPairs = new Set(); // To avoid duplicate conflict reports

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        const conflicts = findConflicts(event1, [event2]);
        
        if (conflicts.length > 0) {
          const pairKey = `${event1.ID}-${event2.ID}`;
          if (!conflictPairs.has(pairKey)) {
            conflictPairs.add(pairKey);
            allConflicts.push({
              event1: {
                id: event1.ID,
                name: event1.Event_Name,
                start: event1.Event_Start_Date,
                end: event1.Event_End_Date,
                priority: event1.Event_Priority,
                flexibility: event1.Event_Flexibility
              },
              event2: {
                id: event2.ID,
                name: event2.Event_Name,
                start: event2.Event_Start_Date,
                end: event2.Event_End_Date,
                priority: event2.Event_Priority,
                flexibility: event2.Event_Flexibility
              },
              conflictDetails: conflicts[0],
              recommendation: generateResolutionRecommendation(conflicts[0])
            });
          }
        }
      }
    }

    res.json({
      success: true,
      totalEvents: events.length,
      conflictCount: allConflicts.length,
      hasConflicts: allConflicts.length > 0,
      conflicts: allConflicts,
      timeRange: {
        start: now,
        end: futureDate,
        days: parseInt(days)
      }
    });

  } catch (error) {
    console.error('Conflict summary error:', error);
    res.status(500).json({ error: 'Failed to get conflict summary', details: error.message });
  }
});

module.exports = router;

