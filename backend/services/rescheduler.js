/**
 * Smart Event Rescheduling Service
 * Finds optimal time slots and handles rescheduling logic
 */

const { detectCascadeConflicts } = require('./conflictDetector');

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
  searchEnd.setDate(searchEnd.getDate() + (sameDayOnly ? 1 : searchDays));

  // Helper to check if time is within work hours
  const isWithinWorkHours = (dateTime, dayOfWeek) => {
    if (!userPreferences.Work_Hours) return true;
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const workHours = userPreferences.Work_Hours[dayName];
    
    if (!workHours || !workHours.start || !workHours.end) return false;
    
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
  const hasConflict = (startTime, endTime) => {
    for (const event of existingEvents) {
      const eventStart = new Date(event.Event_Start_Date);
      const eventEnd = new Date(event.Event_End_Date);
      
      if (startTime < eventEnd && endTime > eventStart) {
        return true;
      }
    }
    return false;
  };

  // Search for available slots
  let currentDate = new Date(searchStart);
  currentDate.setHours(8, 0, 0, 0); // Start at 8 AM
  
  while (currentDate < searchEnd && slots.length < maxSlots) {
    const dayOfWeek = currentDate.getDay();
    
    // Check if within work hours
    if (!isWithinWorkHours(currentDate, dayOfWeek)) {
      currentDate.setMinutes(currentDate.getMinutes() + 30);
      continue;
    }
    
    const slotEnd = new Date(currentDate.getTime() + eventDurationMs);
    
    // Check all constraints
    if (
      isWithinWorkHours(slotEnd, dayOfWeek) &&
      isBeforeBedtime(slotEnd, dayOfWeek) &&
      !isInNoMeetingZone(currentDate, slotEnd, dayOfWeek) &&
      !hasConflict(currentDate, slotEnd)
    ) {
      // Calculate slot score (prefer earlier in day, closer to original date)
      const hourScore = 24 - currentDate.getHours(); // Prefer earlier
      const dayScore = sameDayOnly ? 100 : Math.max(0, searchDays - Math.floor((currentDate - searchStart) / (24 * 60 * 60 * 1000)));
      const preferredTimeScore = isInPreferredMeetingWindow(currentDate, slotEnd, userPreferences) ? 20 : 0;
      
      const score = hourScore + (dayScore * 10) + preferredTimeScore;
      
      slots.push({
        startDateTime: new Date(currentDate),
        endDateTime: new Date(slotEnd),
        date: currentDate.toISOString().split('T')[0],
        startTime: currentDate.toTimeString().substr(0, 5),
        endTime: slotEnd.toTimeString().substr(0, 5),
        score: score,
        reason: generateSlotReason(currentDate, slotEnd, dayOfWeek, preferredTimeScore > 0)
      });
    }
    
    // Move to next 30-minute slot
    currentDate.setMinutes(currentDate.getMinutes() + 30);
    
    // If past 6 PM, move to next day at 8 AM
    if (currentDate.getHours() >= 18) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(8, 0, 0, 0);
    }
  }

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
 */
function findBestDaysForRescheduling(eventDuration, existingEvents, userPreferences, searchDays = 14) {
  const daySlots = {};
  
  const slots = findAvailableTimeSlots(
    eventDuration,
    null,
    existingEvents,
    userPreferences,
    { maxSlots: 50, searchDays }
  );
  
  // Group slots by date
  for (const slot of slots) {
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
  
  // Return top 3 days with their best slots
  return daysArray.slice(0, 3).map(day => ({
    date: day.date,
    dayOfWeek: new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' }),
    availableSlots: day.availableSlots.slice(0, 3), // Top 3 slots for this day
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

module.exports = {
  findAvailableTimeSlots,
  findBestRescheduleSlot,
  findBestDaysForRescheduling,
  calculateEventDuration,
  validateRescheduleProposal,
  isInPreferredMeetingWindow
};

