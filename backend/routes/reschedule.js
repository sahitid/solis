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

    // Get other events for conflict checking
    const searchDate = sameDay ? event.Event_Start_Date : new Date();
    const events = await Event.find({
      User_Email: email,
      ID: { $ne: eventId }
    });

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

    const events = await Event.find({
      User_Email: email,
      ID: { $ne: eventId }
    });

    const bestDays = findBestDaysForRescheduling(
      duration,
      events,
      {
        Work_Hours: user.Work_Hours,
        Bedtime: user.Bedtime,
        No_Meeting_Zones: user.No_Meeting_Zones,
        Preferred_Meeting_Windows: user.Preferred_Meeting_Windows
      },
      searchDays
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

    const events = await Event.find({
      User_Email: email,
      ID: { $ne: eventId }
    });

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
  const { email, eventId, newTimeSlot, reason = '' } = req.body;

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

    if (!event.Event_Guests || event.Event_Guests.length === 0) {
      return res.status(400).json({ error: 'This event has no attendees' });
    }

    // Create reschedule proposal
    const proposal = new RescheduleProposal({
      Proposal_ID: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      User_Email: email,
      Event_ID: eventId,
      Event_Name: event.Event_Name,
      Original_Time_Slot: {
        startDateTime: event.Event_Start_Date,
        endDateTime: event.Event_End_Date
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
        startDateTime: event.Event_Start_Date,
        endDateTime: event.Event_End_Date
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

module.exports = router;

