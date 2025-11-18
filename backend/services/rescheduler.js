/**
 * Smart Event Rescheduling Service
 * Finds optimal time slots and handles rescheduling logic
 */

const { detectCascadeConflicts } = require('./conflictDetector');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Find available time slots for rescheduling an event
 * Considers user preferences (work hours, bedtime, no-meeting zones)
 */
function findAvailableTimeSlots(
  eventDuration, // in minutes
  targetDate, // Date object or null for any day
  existingEvents,
  userPreferences,
  options = {}
) {
  const {
    maxSlots = 5,
    sameDay = false,
    sameDayOnly = false,
    searchDays = 7
  } = options;

  const slots = [];
  const eventDurationMs = eventDuration * 60 * 1000;

  // Determine search range
  const searchStart = targetDate ? new Date(targetDate) : new Date();
  const searchEnd = new Date(searchStart);
  if (sameDayOnly) {
    // Clamp to end of the same day
    searchEnd.setHours(23, 59, 59, 999);
  } else {
    searchEnd.setDate(searchEnd.getDate() + searchDays);
  }

  // Helper to check if time is within work hours
  const isWithinWorkHours = (dateTime, dayOfWeek) => {
    // If no work hours preference, allow all times
    if (!userPreferences.Work_Hours) return true;
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const workHours = userPreferences.Work_Hours[dayName];
    
    // If no work hours defined for this day, allow all times (user can schedule anytime)
    if (!workHours || !workHours.start || !workHours.end) return true;
    
    const timeStr = dateTime.toTimeString().substr(0, 5);
    return timeStr >= workHours.start && timeStr <= workHours.end;
  };

  // Helper to check if time is before bedtime
  const isBeforeBedtime = (dateTime, dayOfWeek) => {
    if (!userPreferences.Bedtime) return true;
    
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const bedtime = isWeekend 
      ? (userPreferences.Bedtime.weekend || '23:00')
      : (userPreferences.Bedtime.weekday || '22:00');
    
    const timeStr = dateTime.toTimeString().substr(0, 5);
    return timeStr < bedtime;
  };

  // Helper to check if time is in no-meeting zone
  const isInNoMeetingZone = (startTime, endTime, dayOfWeek) => {
    if (!userPreferences.No_Meeting_Zones) return false;
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    for (const zone of userPreferences.No_Meeting_Zones) {
      if (zone.day !== dayName) continue;
      
      const zoneStart = zone.start;
      const zoneEnd = zone.end;
      const startTimeStr = startTime.toTimeString().substr(0, 5);
      const endTimeStr = endTime.toTimeString().substr(0, 5);
      
      // Check if slot overlaps with no-meeting zone
      if (startTimeStr < zoneEnd && endTimeStr > zoneStart) {
        return true;
      }
    }
    
    return false;
  };

  // Helper to check if slot conflicts with existing events
  // NOTE: Passive and Flexible events CAN be overlapped, so they're not conflicts
  const hasConflict = (startTime, endTime) => {
    // Ensure startTime and endTime are Date objects
    const slotStart = startTime instanceof Date ? startTime : new Date(startTime);
    const slotEnd = endTime instanceof Date ? endTime : new Date(endTime);
    
    for (const event of existingEvents) {
      // Ignore all-day events entirely
      if (event.isAllDay) {
        continue;
      }
      const eventStart = new Date(event.Event_Start_Date);
      const eventEnd = new Date(event.Event_End_Date);
      
      // Check if times overlap (using proper date comparison)
      if (slotStart < eventEnd && slotEnd > eventStart) {
        // Allow overlap with Passive or Flexible events (PRD requirement)
        const flexibility = event.Event_Flexibility || 'Busy';
        if (flexibility === 'Passive' || flexibility === 'Flexible') {
          console.log(`✅ Allowing overlap with ${flexibility} event: ${event.Event_Name} (${eventStart.toLocaleTimeString()} - ${eventEnd.toLocaleTimeString()})`);
          continue; // This event can be overlapped, not a conflict
        }
        
        // Rigid and Busy events are real conflicts - cannot overlap
        console.log(`❌ Conflict with ${flexibility} event: ${event.Event_Name} (${eventStart.toLocaleTimeString()} - ${eventEnd.toLocaleTimeString()})`);
        console.log(`   Slot: ${slotStart.toLocaleTimeString()} - ${slotEnd.toLocaleTimeString()}`);
        return true;
      }
    }
    return false;
  };

  // Search for available slots
  let currentDate = new Date(searchStart);
  currentDate.setHours(8, 0, 0, 0); // Start at 8 AM
  
  // IMPORTANT: For same-day slots, don't suggest times in the past
  const now = new Date();
  if (sameDayOnly && currentDate < now) {
    // If we're looking for same-day slots and current time is in the past, start from now
    currentDate = new Date(now);
    // Round up to next 30-minute mark
    const minutes = currentDate.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    currentDate.setMinutes(roundedMinutes);
    currentDate.setSeconds(0, 0);
    // If rounding pushed us into tomorrow, bail (no same-day times left)
    const sameDay = new Date(searchStart);
    if (currentDate.getFullYear() !== sameDay.getFullYear() ||
        currentDate.getMonth() !== sameDay.getMonth() ||
        currentDate.getDate() !== sameDay.getDate()) {
      console.log('⏭️ Same-day search exhausted (current time beyond end of day)');
      return [];
    }
    console.log(`⏰ Same-day search: Starting from current time ${currentDate.toLocaleTimeString()} (not past)`);
  }
  
  console.log(`🔍 Searching for slots from ${currentDate.toLocaleString()} to ${searchEnd.toLocaleString()}`);
  console.log(`📏 Event duration: ${eventDuration} minutes`);
  console.log(`📋 Existing events to check: ${existingEvents.length}`);
  
  let checkedSlots = 0;
  
  while (currentDate < searchEnd && slots.length < maxSlots) {
    const dayOfWeek = currentDate.getDay();
    
    // IMPORTANT: Skip times in the past (for same-day searches)
    // Re-check 'now' each iteration since time is moving forward
    const currentNow = new Date();
    if (sameDayOnly && currentDate < currentNow) {
      currentDate.setMinutes(currentDate.getMinutes() + 30);
      continue;
    }
    // Guard: never roll into the next day during same-day searches
    if (sameDayOnly) {
      const sameDay = new Date(searchStart);
      if (currentDate.getFullYear() !== sameDay.getFullYear() ||
          currentDate.getMonth() !== sameDay.getMonth() ||
          currentDate.getDate() !== sameDay.getDate()) {
        break;
      }
    }
    
    // Check if within work hours
    if (!isWithinWorkHours(currentDate, dayOfWeek)) {
      currentDate.setMinutes(currentDate.getMinutes() + 30);
      continue;
    }
    
    const slotEnd = new Date(currentDate.getTime() + eventDurationMs);
    
    checkedSlots++;
    
    // Check all constraints
    const passesWorkHours = isWithinWorkHours(slotEnd, dayOfWeek);
    const passesBedtime = isBeforeBedtime(slotEnd, dayOfWeek);
    const passesNoMeetingZone = !isInNoMeetingZone(currentDate, slotEnd, dayOfWeek);
    const passesConflictCheck = !hasConflict(currentDate, slotEnd);
    
    if (passesWorkHours && passesBedtime && passesNoMeetingZone && passesConflictCheck) {
      // Calculate slot score (prefer earlier in day, closer to original date)
      const hourScore = 24 - currentDate.getHours(); // Prefer earlier
      const dayScore = sameDayOnly ? 100 : Math.max(0, searchDays - Math.floor((currentDate - searchStart) / (24 * 60 * 60 * 1000)));
      const preferredTimeScore = isInPreferredMeetingWindow(currentDate, slotEnd, userPreferences) ? 20 : 0;
      
      const score = hourScore + (dayScore * 10) + preferredTimeScore;
      
      console.log(`✅ Found slot: ${currentDate.toTimeString().substr(0, 5)} - ${slotEnd.toTimeString().substr(0, 5)} (score: ${score})`);
      
      // Format date as YYYY-MM-DD using local time (not UTC) to avoid timezone issues
      const formatDateLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      slots.push({
        startDateTime: new Date(currentDate),
        endDateTime: new Date(slotEnd),
        date: formatDateLocal(currentDate), // Use local date, not UTC
        startTime: currentDate.toTimeString().substr(0, 5),
        endTime: slotEnd.toTimeString().substr(0, 5),
        score: score,
        reason: generateSlotReason(currentDate, slotEnd, dayOfWeek, preferredTimeScore > 0)
      });
    } else {
      // Log why this slot was rejected
      if (!passesWorkHours) console.log(`❌ ${currentDate.toTimeString().substr(0, 5)}: Outside work hours`);
      if (!passesBedtime) console.log(`❌ ${currentDate.toTimeString().substr(0, 5)}: Past bedtime`);
      if (!passesNoMeetingZone) console.log(`❌ ${currentDate.toTimeString().substr(0, 5)}: In no-meeting zone`);
      if (!passesConflictCheck) console.log(`❌ ${currentDate.toTimeString().substr(0, 5)}: Has conflict`);
    }
    
    // Move to next 30-minute slot
    currentDate.setMinutes(currentDate.getMinutes() + 30);
    
    // If past 8 PM, move to next day at 8 AM
    if (!sameDayOnly && currentDate.getHours() >= 20) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(8, 0, 0, 0);
    }
  }
  
  console.log(`📊 Checked ${checkedSlots} slots, found ${slots.length} available`);


  // Sort by score (highest first)
  slots.sort((a, b) => b.score - a.score);

  return slots;
}

/**
 * Check if time is in preferred meeting window
 */
function isInPreferredMeetingWindow(startTime, endTime, userPreferences) {
  if (!userPreferences.Preferred_Meeting_Windows) return false;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[startTime.getDay()];
  
  for (const window of userPreferences.Preferred_Meeting_Windows) {
    if (window.day !== dayName) continue;
    
    const windowStart = window.start;
    const windowEnd = window.end;
    const startTimeStr = startTime.toTimeString().substr(0, 5);
    const endTimeStr = endTime.toTimeString().substr(0, 5);
    
    if (startTimeStr >= windowStart && endTimeStr <= windowEnd) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate human-readable reason for why this slot is suggested
 */
function generateSlotReason(startTime, endTime, dayOfWeek, isPreferred) {
  const reasons = [];
  
  const hour = startTime.getHours();
  if (hour >= 9 && hour <= 11) {
    reasons.push('Morning slot - typically productive time');
  } else if (hour >= 14 && hour <= 16) {
    reasons.push('Early afternoon - good for meetings');
  }
  
  if (isPreferred) {
    reasons.push('Within your preferred meeting window');
  }
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  reasons.push(`${dayNames[dayOfWeek]} availability`);
  
  return reasons.join('; ');
}

/**
 * Find best reschedule slot for an event
 * Returns the single best option
 */
function findBestRescheduleSlot(eventDuration, targetDate, existingEvents, userPreferences, sameDay = false) {
  const slots = findAvailableTimeSlots(
    eventDuration,
    targetDate,
    existingEvents,
    userPreferences,
    { maxSlots: 1, sameDay, sameDayOnly: sameDay }
  );
  
  return slots.length > 0 ? slots[0] : null;
}

/**
 * Find best days for rescheduling (returns top 3 days with available slots)
 * NOTE: Only returns dates AFTER the original date (not before)
 */
function findBestDaysForRescheduling(eventDuration, existingEvents, userPreferences, searchDays = 14, originalDate = null) {
  const daySlots = {};
  
  const slots = findAvailableTimeSlots(
    eventDuration,
    originalDate || new Date(), // Start from original date or today
    existingEvents,
    userPreferences,
    { maxSlots: 50, searchDays }
  );
  
  // Only include dates >= original date (no dates before)
  // Use proper date comparison (not string comparison) to handle timezones correctly
  const originalDateObj = originalDate ? new Date(originalDate) : null;
  if (originalDateObj) {
    originalDateObj.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
  }
  
  // Group slots by date
  for (const slot of slots) {
    // IMPORTANT: Skip dates before or equal to the original date (PRD: cannot go in the past, and "another day" means different day)
    if (originalDateObj) {
      // Parse date string (YYYY-MM-DD) as local date, not UTC
      const [year, month, day] = slot.date.split('-').map(Number);
      const slotDate = new Date(year, month - 1, day); // month is 0-indexed
      slotDate.setHours(0, 0, 0, 0);
      // Exclude dates before OR equal to original date (for "move to another day", we want only future days)
      if (slotDate <= originalDateObj) {
        const originalDateStr = `${originalDateObj.getFullYear()}-${String(originalDateObj.getMonth() + 1).padStart(2, '0')}-${String(originalDateObj.getDate()).padStart(2, '0')}`;
        console.log(`⏭️ Skipping ${slot.date} (before or equal to original date ${originalDateStr})`);
        continue;
      }
    }
    
    if (!daySlots[slot.date]) {
      daySlots[slot.date] = {
        date: slot.date,
        availableSlots: [],
        totalScore: 0
      };
    }
    daySlots[slot.date].availableSlots.push(slot);
    daySlots[slot.date].totalScore += slot.score;
  }
  
  // Convert to array and sort by total score
  const daysArray = Object.values(daySlots);
  daysArray.sort((a, b) => b.totalScore - a.totalScore);
  
  const originalDateStr = originalDateObj ? originalDateObj.toISOString().split('T')[0] : 'today';
  console.log(`📅 Found ${daysArray.length} days with available slots (all >= ${originalDateStr})`);
  
  // Return top 3 days with ALL their available slots (not just top 3)
  // Sort slots within each day by score (best first)
  daysArray.forEach(day => {
    day.availableSlots.sort((a, b) => b.score - a.score);
  });
  
  return daysArray.slice(0, 3).map(day => ({
    date: day.date,
    dayOfWeek: new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' }),
    availableSlots: day.availableSlots, // ALL slots for this day (sorted by score)
    reason: `${day.availableSlots.length} available time slots`
  }));
}

/**
 * Calculate event duration in minutes
 */
function calculateEventDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end - start) / 60000);
}

/**
 * Validate if a proposed reschedule is acceptable
 * Returns validation result with any issues found
 */
function validateRescheduleProposal(newTimeSlot, event, existingEvents, userPreferences) {
  const issues = [];
  
  const startTime = new Date(newTimeSlot.startDateTime);
  const endTime = new Date(newTimeSlot.endDateTime);
  const dayOfWeek = startTime.getDay();
  
  // Check work hours
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  const workHours = userPreferences.Work_Hours?.[dayName];
  
  if (workHours && workHours.start && workHours.end) {
    const startTimeStr = startTime.toTimeString().substr(0, 5);
    const endTimeStr = endTime.toTimeString().substr(0, 5);
    
    if (startTimeStr < workHours.start || endTimeStr > workHours.end) {
      issues.push({
        type: 'outside_work_hours',
        message: `This time is outside your work hours (${workHours.start} - ${workHours.end})`
      });
    }
  }
  
  // Check bedtime
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const bedtime = isWeekend
    ? (userPreferences.Bedtime?.weekend || '23:00')
    : (userPreferences.Bedtime?.weekday || '22:00');
  
  if (endTime.toTimeString().substr(0, 5) > bedtime) {
    issues.push({
      type: 'past_bedtime',
      message: `This time extends past your bedtime (${bedtime})`
    });
  }
  
  // Check for conflicts with existing events
  for (const existingEvent of existingEvents) {
    if (existingEvent.ID === event.ID) continue;
    
    const existingStart = new Date(existingEvent.Event_Start_Date);
    const existingEnd = new Date(existingEvent.Event_End_Date);
    
    if (startTime < existingEnd && endTime > existingStart) {
      issues.push({
        type: 'conflict',
        message: `Conflicts with: ${existingEvent.Event_Name}`,
        conflictingEvent: existingEvent
      });
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Use Gemini AI to compare priority of two events based on their titles and descriptions
 * Returns which event is more important and why
 */
async function compareEventPriorityWithAI(event1, event2) {
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
Title: ${event1.Event_Name || event1.title}
Description: ${event1.Event_Description || event1.description || 'None'}
Has attendees: ${(event1.Event_Guests || event1.attendees || []).length > 0}

Event 2:
Title: ${event2.Event_Name || event2.title}
Description: ${event2.Event_Description || event2.description || 'None'}
Has attendees: ${(event2.Event_Guests || event2.attendees || []).length > 0}

Which event is more important?`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      higherPriorityEvent: parsed.higherPriorityEvent,
      reason: parsed.reason,
      confidenceLevel: parsed.confidenceLevel
    };

  } catch (error) {
    console.error('AI priority comparison error:', error);
    return {
      success: false,
      error: error.message,
      // Fallback to basic comparison
      higherPriorityEvent: (event1.Event_Priority || 2) > (event2.Event_Priority || 2) ? 1 : 2,
      reason: 'Using priority values (AI unavailable)',
      confidenceLevel: 'low'
    };
  }
}

module.exports = {
  findAvailableTimeSlots,
  findBestRescheduleSlot,
  findBestDaysForRescheduling,
  calculateEventDuration,
  validateRescheduleProposal,
  isInPreferredMeetingWindow,
  compareEventPriorityWithAI
};

