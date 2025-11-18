const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const RescheduleProposal = require('../models/RescheduleProposal');
const {
  findBestRescheduleSlot,
  findBestDaysForRescheduling,
  findAvailableTimeSlots,
  calculateEventDuration,
  validateRescheduleProposal,
  compareEventPriorityWithAI
} = require('../services/rescheduler');
const {
  sendRescheduleProposal,
  sendRescheduleConfirmation,
  calculateMajorityVote
} = require('../services/emailService');
const { updateCalendarEvent } = require('../services/calendarService');
const { deleteCalendarEvent } = require('../services/calendarService');
const { detectCascadeConflicts } = require('../services/conflictDetector');

// @route   POST /api/reschedule/find-best-slot
// @desc    Find the best time slot to reschedule an event
// @access  Private
router.post('/find-best-slot', async (req, res) => {
  const { email, eventId, sameDay = false } = req.body;

  if (!email || !eventId) {
    return res.status(400).json({ error: 'Email and event ID are required' });
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

    // Calculate event duration
    const duration = calculateEventDuration(event.Event_Start_Date, event.Event_End_Date);

    // Get all events from Google Calendar (source of truth) for conflict checking
    const searchDate = sameDay ? event.Event_Start_Date : new Date();
    const searchStart = new Date(searchDate);
    searchStart.setHours(0, 0, 0, 0);
    const searchEnd = new Date(searchDate);
    if (sameDay) {
      searchEnd.setHours(23, 59, 59, 999);
    } else {
      searchEnd.setDate(searchEnd.getDate() + 7);
      searchEnd.setHours(23, 59, 59, 999);
    }

    console.log(`📅 Fetching events from Google Calendar from ${searchStart.toDateString()} to ${searchEnd.toDateString()}`);
    
    const { getCalendarEvents } = require('../services/calendarService');
    const calendarResult = await getCalendarEvents(
      user.OAuth_Token,
      searchStart.toISOString(),
      searchEnd.toISOString()
    );

    let events = [];
    
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
      events = calendarResult.events
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
      events = await Event.find({
        User_Email: email,
        ID: { $ne: eventId }
      }).lean();
      // Mark DB all-day/multi-day events best-effort
      events = events.map(e => {
        const start = new Date(e.Event_Start_Date);
        const end = new Date(e.Event_End_Date);
        const durationHours = (end - start) / (1000 * 60 * 60);
        const isMidnightStart = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0;
        const spansDifferentDay = start.toDateString() !== end.toDateString();
        const isAllDay = spansDifferentDay || (durationHours >= 23 && durationHours <= 25) || isMidnightStart;
        return { ...e, isAllDay };
      });
    }

    console.log(`📋 Using ${events.length} events for slot finding (excluding event being rescheduled)`);

    // Find best slot
    const bestSlot = findBestRescheduleSlot(
      duration,
      searchDate,
      events,
      {
        Work_Hours: user.Work_Hours,
        Bedtime: user.Bedtime,
        No_Meeting_Zones: user.No_Meeting_Zones,
        Preferred_Meeting_Windows: user.Preferred_Meeting_Windows
      },
      sameDay
    );

    if (!bestSlot) {
      return res.json({
        success: false,
        message: sameDay 
          ? 'No available slots found today'
          : 'No available slots found in the next 7 days',
        bestSlot: null
      });
    }

    res.json({
      success: true,
      message: 'Best slot found',
      bestSlot,
      event: {
        id: event.ID,
        name: event.Event_Name,
        currentStart: event.Event_Start_Date,
        currentEnd: event.Event_End_Date
      }
    });

  } catch (error) {
    console.error('Find best slot error:', error);
    res.status(500).json({ error: 'Failed to find best slot', details: error.message });
  }
});

// @route   POST /api/reschedule/find-alternative-days
// @desc    Find best alternative days for rescheduling
// @access  Private
router.post('/find-alternative-days', async (req, res) => {
  const { email, eventId, searchDays = 14 } = req.body;

  if (!email || !eventId) {
    return res.status(400).json({ error: 'Email and event ID are required' });
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

    // Get all events from Google Calendar (source of truth) for conflict checking
    const originalDate = new Date(event.Event_Start_Date);
    const searchStart = new Date(originalDate);
    searchStart.setHours(0, 0, 0, 0);
    const searchEnd = new Date(originalDate);
    searchEnd.setDate(searchEnd.getDate() + searchDays);
    searchEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Fetching events from Google Calendar from ${searchStart.toDateString()} to ${searchEnd.toDateString()}`);
    
    const calendarResult = await getCalendarEvents(
      user.OAuth_Token,
      searchStart.toISOString(),
      searchEnd.toISOString()
    );

    let events = [];
    
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
      events = calendarResult.events
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
      events = await Event.find({
        User_Email: email,
        ID: { $ne: eventId }
      }).lean();
      // Mark DB all-day/multi-day events best-effort
      events = events.map(e => {
        const start = new Date(e.Event_Start_Date);
        const end = new Date(e.Event_End_Date);
        const durationHours = (end - start) / (1000 * 60 * 60);
        const isMidnightStart = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0;
        const spansDifferentDay = start.toDateString() !== end.toDateString();
        const isAllDay = spansDifferentDay || (durationHours >= 23 && durationHours <= 25) || isMidnightStart;
        return { ...e, isAllDay };
      });
    }

    console.log(`📋 Using ${events.length} events for slot finding (excluding event being rescheduled)`);

    const bestDays = findBestDaysForRescheduling(
      duration,
      events,
      {
        Work_Hours: user.Work_Hours,
        Bedtime: user.Bedtime,
        No_Meeting_Zones: user.No_Meeting_Zones,
        Preferred_Meeting_Windows: user.Preferred_Meeting_Windows
      },
      searchDays,
      originalDate
    );

    res.json({
      success: true,
      bestDays,
      event: {
        id: event.ID,
        name: event.Event_Name
      }
    });

  } catch (error) {
    console.error('Find alternative days error:', error);
    res.status(500).json({ error: 'Failed to find alternative days', details: error.message });
  }
});

// @route   POST /api/reschedule/find-same-day-slots
// @desc    Find available slots on the same day
// @access  Private
router.post('/find-same-day-slots', async (req, res) => {
  const { email, eventId, maxSlots = 3 } = req.body;

  if (!email || !eventId) {
    return res.status(400).json({ error: 'Email and event ID are required' });
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

    // Get all events from Google Calendar (source of truth) for the same day
    const eventDate = new Date(event.Event_Start_Date);
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

    let events = [];
    
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
      events = calendarResult.events
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
      events = await Event.find({
        User_Email: email,
        ID: { $ne: eventId }
      }).lean();
      // Mark DB all-day/multi-day events best-effort
      events = events.map(e => {
        const start = new Date(e.Event_Start_Date);
        const end = new Date(e.Event_End_Date);
        const durationHours = (end - start) / (1000 * 60 * 60);
        const isMidnightStart = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0;
        const spansDifferentDay = start.toDateString() !== end.toDateString();
        const isAllDay = spansDifferentDay || (durationHours >= 23 && durationHours <= 25) || isMidnightStart;
        return { ...e, isAllDay };
      });
    }

    console.log(`📋 Using ${events.length} events for slot finding (excluding event being rescheduled)`);

    const slots = findAvailableTimeSlots(
      duration,
      event.Event_Start_Date,
      events,
      {
        Work_Hours: user.Work_Hours,
        Bedtime: user.Bedtime,
        No_Meeting_Zones: user.No_Meeting_Zones,
        Preferred_Meeting_Windows: user.Preferred_Meeting_Windows
      },
      { maxSlots, sameDayOnly: true }
    );

    res.json({
      success: true,
      slots,
      event: {
        id: event.ID,
        name: event.Event_Name
      }
    });

  } catch (error) {
    console.error('Find same-day slots error:', error);
    res.status(500).json({ error: 'Failed to find same-day slots', details: error.message });
  }
});

// @route   POST /api/reschedule/execute-solo
// @desc    Execute reschedule for solo event (no attendees or user approved)
// @access  Private
router.post('/execute-solo', async (req, res) => {
  const { email, eventId, newTimeSlot } = req.body;

  if (!email || !eventId || !newTimeSlot) {
    return res.status(400).json({ error: 'Email, event ID, and new time slot are required' });
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

    // HARDCODED RESTRICTION: No rescheduling allowed before 6 AM or after 10 PM
    const proposedStart = new Date(newTimeSlot.startDateTime);
    const proposedEnd = new Date(newTimeSlot.endDateTime);
    const MIN_HOUR = 6;  // 6 AM
    const MAX_HOUR = 22; // 10 PM (22:00)
    const startHour = proposedStart.getHours();
    const endHour = proposedEnd.getHours();
    
    if (startHour < MIN_HOUR || startHour >= MAX_HOUR || endHour < MIN_HOUR || endHour >= MAX_HOUR) {
      return res.status(400).json({
        success: false,
        error: 'Rescheduling is not allowed before 6 AM or after 10 PM',
        details: `Selected time: ${startHour.toString().padStart(2, '0')}:${proposedStart.getMinutes().toString().padStart(2, '0')}`
      });
    }

    // Validate the new time slot
    const otherEvents = await Event.find({
      User_Email: email,
      ID: { $ne: eventId }
    });

    const validation = validateRescheduleProposal(
      newTimeSlot,
      event,
      otherEvents,
      {
        Work_Hours: user.Work_Hours,
        Bedtime: user.Bedtime,
        No_Meeting_Zones: user.No_Meeting_Zones
      }
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time slot',
        issues: validation.issues
      });
    }

    // Update in Google Calendar
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
        error: 'Failed to update Google Calendar',
        details: calendarUpdate.error
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
      message: 'Event rescheduled successfully',
      event: {
        id: event.ID,
        name: event.Event_Name,
        newStart: event.Event_Start_Date,
        newEnd: event.Event_End_Date
      }
    });

  } catch (error) {
    console.error('Execute solo reschedule error:', error);
    res.status(500).json({ error: 'Failed to reschedule event', details: error.message });
  }
});

// @route   POST /api/reschedule/propose-multi-attendee
// @desc    Create and send reschedule proposal for multi-attendee event
// @access  Private
router.post('/propose-multi-attendee', async (req, res) => {
  const { email, eventId, newTimeSlot, reason = '', eventData } = req.body;

  if (!email || !newTimeSlot) {
    return res.status(400).json({ error: 'Email and new time slot are required' });
  }

  // Either eventId or eventData must be provided
  if (!eventId && !eventData) {
    return res.status(400).json({ error: 'Either event ID or event data is required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use provided eventData or fetch from database
    let event;
    if (eventData) {
      // Use provided event data (for cases where event was already deleted)
      event = eventData;
    } else {
      event = await Event.findOne({ ID: eventId, User_Email: email });
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
    }

    if (!event.Event_Guests || event.Event_Guests.length === 0) {
      return res.status(400).json({ error: 'This event has no attendees' });
    }

    // Ensure dates are Date objects for proposal and email
    const originalStart = event.Event_Start_Date instanceof Date 
      ? event.Event_Start_Date 
      : new Date(event.Event_Start_Date);
    const originalEnd = event.Event_End_Date instanceof Date 
      ? event.Event_End_Date 
      : new Date(event.Event_End_Date);

    // Create reschedule proposal
    const proposal = new RescheduleProposal({
      Proposal_ID: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      User_Email: email,
      Event_ID: eventId || 'deleted_event', // Use 'deleted_event' if eventId is not available
      Event_Name: event.Event_Name,
      Original_Time_Slot: {
        startDateTime: originalStart,
        endDateTime: originalEnd
      },
      Proposed_Time_Slot: newTimeSlot,
      Reason: reason,
      Attendee_Responses: event.Event_Guests.map(guest => ({
        email: guest.email,
        name: guest.name,
        status: 'pending'
      }))
    });

    // Send email proposal
    const emailResult = await sendRescheduleProposal(
      user.OAuth_Token,
      event,
      {
        startDateTime: originalStart,
        endDateTime: originalEnd
      },
      newTimeSlot,
      reason
    );

    if (emailResult.success) {
      proposal.Email_Sent = true;
      proposal.Email_Message_ID = emailResult.messageId;
      proposal.Email_Subject = emailResult.emailContent.subject;
      proposal.Email_Body = emailResult.emailContent.body;
    }

    await proposal.save();

    res.json({
      success: true,
      message: 'Reschedule proposal sent to attendees',
      proposal: {
        id: proposal.Proposal_ID,
        status: proposal.Proposal_Status,
        emailSent: proposal.Email_Sent,
        expiresAt: proposal.Expires_At,
        attendeeCount: proposal.Attendee_Responses.length
      },
      emailContent: emailResult.emailContent
    });

  } catch (error) {
    console.error('Propose multi-attendee reschedule error:', error);
    res.status(500).json({ error: 'Failed to create proposal', details: error.message });
  }
});

// @route   POST /api/reschedule/record-response
// @desc    Record an attendee's response to a reschedule proposal
// @access  Private
router.post('/record-response', async (req, res) => {
  const { proposalId, attendeeEmail, response } = req.body;

  if (!proposalId || !attendeeEmail || !response) {
    return res.status(400).json({ error: 'Proposal ID, attendee email, and response are required' });
  }

  if (!['yes', 'no', 'tentative'].includes(response)) {
    return res.status(400).json({ error: 'Response must be yes, no, or tentative' });
  }

  try {
    const proposal = await RescheduleProposal.findOne({ Proposal_ID: proposalId });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (proposal.Finalized) {
      return res.status(400).json({ error: 'This proposal has already been finalized' });
    }

    // Update attendee response
    const attendee = proposal.Attendee_Responses.find(a => a.email === attendeeEmail);
    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found in proposal' });
    }

    attendee.response = response;
    attendee.status = 'responded';
    attendee.responseDate = new Date();

    // Calculate majority vote
    const voteResult = calculateMajorityVote(proposal.Attendee_Responses);
    proposal.Majority_Vote_Result = {
      yesCount: voteResult.counts.yes,
      noCount: voteResult.counts.no,
      tentativeCount: voteResult.counts.tentative,
      unclearCount: voteResult.counts.unclear,
      noResponseCount: voteResult.counts.noResponse,
      hasMajority: voteResult.hasMajority,
      decision: voteResult.decision
    };

    proposal.Proposal_Status = voteResult.decision;

    await proposal.save();

    res.json({
      success: true,
      message: 'Response recorded',
      voteResult: proposal.Majority_Vote_Result,
      proposalStatus: proposal.Proposal_Status
    });

  } catch (error) {
    console.error('Record response error:', error);
    res.status(500).json({ error: 'Failed to record response', details: error.message });
  }
});

// @route   POST /api/reschedule/finalize-proposal
// @desc    Finalize a reschedule proposal (after majority approval)
// @access  Private
router.post('/finalize-proposal', async (req, res) => {
  const { email, proposalId } = req.body;

  if (!email || !proposalId) {
    return res.status(400).json({ error: 'Email and proposal ID are required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const proposal = await RescheduleProposal.findOne({ 
      Proposal_ID: proposalId,
      User_Email: email
    });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (proposal.Finalized) {
      return res.status(400).json({ error: 'Proposal already finalized' });
    }

    if (proposal.Proposal_Status !== 'approved') {
      return res.status(400).json({ 
        error: 'Cannot finalize proposal without majority approval',
        status: proposal.Proposal_Status
      });
    }

    // Get the event
    const event = await Event.findOne({ ID: proposal.Event_ID });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update in Google Calendar
    const calendarUpdate = await updateCalendarEvent(
      user.OAuth_Token,
      event.GCal_Event_ID,
      {
        start: {
          dateTime: new Date(proposal.Proposed_Time_Slot.startDateTime).toISOString(),
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: new Date(proposal.Proposed_Time_Slot.endDateTime).toISOString(),
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
    event.Event_Start_Date = new Date(proposal.Proposed_Time_Slot.startDateTime);
    event.Event_End_Date = new Date(proposal.Proposed_Time_Slot.endDateTime);
    event.Start_Time = new Date(proposal.Proposed_Time_Slot.startDateTime).toTimeString().substr(0, 5);
    event.End_Time = new Date(proposal.Proposed_Time_Slot.endDateTime).toTimeString().substr(0, 5);
    await event.save();

    // Send confirmation emails
    await sendRescheduleConfirmation(
      user.OAuth_Token,
      event,
      proposal.Proposed_Time_Slot
    );

    // Mark proposal as finalized
    proposal.Finalized = true;
    proposal.Finalized_At = new Date();
    await proposal.save();

    res.json({
      success: true,
      message: 'Event rescheduled successfully and all attendees notified',
      event: {
        id: event.ID,
        name: event.Event_Name,
        newStart: event.Event_Start_Date,
        newEnd: event.Event_End_Date
      }
    });

  } catch (error) {
    console.error('Finalize proposal error:', error);
    res.status(500).json({ error: 'Failed to finalize proposal', details: error.message });
  }
});

// @route   GET /api/reschedule/proposal/:proposalId
// @desc    Get reschedule proposal status
// @access  Private
router.get('/proposal/:proposalId', async (req, res) => {
  const { proposalId } = req.params;
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const proposal = await RescheduleProposal.findOne({ 
      Proposal_ID: proposalId,
      User_Email: email
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json({
      success: true,
      proposal: {
        id: proposal.Proposal_ID,
        eventName: proposal.Event_Name,
        originalTimeSlot: proposal.Original_Time_Slot,
        proposedTimeSlot: proposal.Proposed_Time_Slot,
        reason: proposal.Reason,
        status: proposal.Proposal_Status,
        attendeeResponses: proposal.Attendee_Responses,
        majorityVoteResult: proposal.Majority_Vote_Result,
        finalized: proposal.Finalized,
        expiresAt: proposal.Expires_At,
        createdAt: proposal.createdAt
      }
    });

  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({ error: 'Failed to get proposal', details: error.message });
  }
});

// @route   POST /api/reschedule/cancel-event
// @desc    Cancel an event (with email notification if has attendees)
// @access  Private
router.post('/cancel-event', async (req, res) => {
  const { email, eventId, reason = '' } = req.body;
  
  if (!email || !eventId) {
    return res.status(400).json({ success: false, error: 'Email and event ID are required' });
  }
  
  try {
    const user = await User.findOne({ Email: email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const event = await Event.findOne({ ID: eventId, User_Email: email });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    const hasAttendees = (event.Event_Guests || []).length > 0;
    
    // Delete from Google Calendar (automatically notifies attendees)
    const calendarDelete = await deleteCalendarEvent(user.OAuth_Token, event.GCal_Event_ID);
    if (!calendarDelete.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete event from Google Calendar',
        details: calendarDelete.error
      });
    }
    
    // Delete from DB
    await Event.deleteOne({ ID: eventId, User_Email: email });
    
    res.json({
      success: true,
      message: hasAttendees
        ? 'Event canceled and attendees notified via Google Calendar'
        : 'Event canceled',
      event: {
        id: eventId,
        name: event.Event_Name
      }
    });
    
  } catch (error) {
    console.error('Cancel event (reschedule) error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel event', details: error.message });
  }
});

module.exports = router;

