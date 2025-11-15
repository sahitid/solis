/**
 * Conflict Detection Service
 * Detects scheduling conflicts and determines resolution strategies
 */

/**
 * Check if two events overlap in time
 */
function doEventsOverlap(event1Start, event1End, event2Start, event2End) {
  const start1 = new Date(event1Start);
  const end1 = new Date(event1End);
  const start2 = new Date(event2Start);
  const end2 = new Date(event2End);

  // Events overlap if one starts before the other ends
  // and the other starts before the first one ends
  return start1 < end2 && start2 < end1;
}

/**
 * Determine if an event can overlap with others based on flexibility and type
 */
function canEventOverlap(event) {
  const flexibility = event.Event_Flexibility || event.flexibility;
  const eventType = event.Event_Type || event.category;

  // Flexibility rules:
  // - Rigid: cannot overlap
  // - Passive: can overlap
  // - Busy: cannot overlap
  // - Flexible: can overlap

  // Type rules:
  // - "free" and "studying" can always overlap with each other and themselves
  
  if (eventType === 'free' || eventType === 'studying') {
    return true;
  }

  return flexibility === 'Passive' || flexibility === 'Flexible';
}

/**
 * Determine if an event can be moved based on flexibility
 */
function canEventBeMoved(event) {
  const flexibility = event.Event_Flexibility || event.flexibility;

  // Flexibility rules:
  // - Rigid: cannot move
  // - Passive: cannot move
  // - Busy: can move
  // - Flexible: can move

  return flexibility === 'Busy' || flexibility === 'Flexible';
}

/**
 * Calculate conflict severity score (higher = more severe)
 */
function calculateConflictSeverity(event1, event2) {
  let severity = 0;

  // Priority contribution (0-6 points)
  const priority1 = event1.Event_Priority || event1.priority || 2;
  const priority2 = event2.Event_Priority || event2.priority || 2;
  severity += Math.abs(priority1 - priority2) * 2;

  // Flexibility contribution (0-3 points)
  const flex1 = event1.Event_Flexibility || event1.flexibility;
  const flex2 = event2.Event_Flexibility || event2.flexibility;
  const flexValues = { Flexible: 0, Busy: 1, Passive: 2, Rigid: 3 };
  severity += Math.abs((flexValues[flex1] || 1) - (flexValues[flex2] || 1));

  // Attendee contribution (0-5 points)
  const attendees1 = (event1.Event_Guests || event1.attendees || []).length;
  const attendees2 = (event2.Event_Guests || event2.attendees || []).length;
  if (attendees1 > 0 && attendees2 > 0) severity += 5; // Both have attendees
  else if (attendees1 > 0 || attendees2 > 0) severity += 3; // One has attendees

  return severity;
}

/**
 * Determine which event is more important
 * Returns: 1 if event1 is more important, 2 if event2 is more important, 0 if equal
 */
function compareEventImportance(event1, event2) {
  const priority1 = event1.Event_Priority || event1.priority || 2;
  const priority2 = event2.Event_Priority || event2.priority || 2;

  // Higher priority number = more important
  if (priority1 > priority2) return 1;
  if (priority2 > priority1) return 2;

  // If priorities are equal, check flexibility
  // Less flexible = more important
  const flexValues = { Rigid: 3, Passive: 2, Busy: 1, Flexible: 0 };
  const flex1 = flexValues[event1.Event_Flexibility || event1.flexibility] || 1;
  const flex2 = flexValues[event2.Event_Flexibility || event2.flexibility] || 1;

  if (flex1 > flex2) return 1;
  if (flex2 > flex1) return 2;

  // If still equal, consider attendees (events with more attendees are more important)
  const attendees1 = (event1.Event_Guests || event1.attendees || []).length;
  const attendees2 = (event2.Event_Guests || event2.attendees || []).length;

  if (attendees1 > attendees2) return 1;
  if (attendees2 > attendees1) return 2;

  return 0; // Truly equal
}

/**
 * Determine which event is more flexible
 * Returns: 1 if event1 is more flexible, 2 if event2 is more flexible, 0 if equal
 */
function compareEventFlexibility(event1, event2) {
  const flexValues = { Rigid: 0, Passive: 1, Busy: 2, Flexible: 3 };
  const flex1 = flexValues[event1.Event_Flexibility || event1.flexibility] || 1;
  const flex2 = flexValues[event2.Event_Flexibility || event2.flexibility] || 1;

  if (flex1 > flex2) return 1;
  if (flex2 > flex1) return 2;
  return 0;
}

/**
 * Check if an event has multiple attendees
 */
function hasMultipleAttendees(event) {
  const attendees = event.Event_Guests || event.attendees || [];
  return attendees.length > 0;
}

/**
 * Find all conflicting events for a new event
 */
function findConflicts(newEvent, existingEvents) {
  const conflicts = [];

  for (const existingEvent of existingEvents) {
    // Skip if same event
    if (existingEvent.ID === newEvent.ID || 
        existingEvent.GCal_Event_ID === newEvent.GCal_Event_ID) {
      continue;
    }

    // Check for time overlap
    const overlaps = doEventsOverlap(
      newEvent.Event_Start_Date || newEvent.startDateTime,
      newEvent.Event_End_Date || newEvent.endDateTime,
      existingEvent.Event_Start_Date,
      existingEvent.Event_End_Date
    );

    if (!overlaps) continue;

    // Check if both events can overlap
    const newCanOverlap = canEventOverlap(newEvent);
    const existingCanOverlap = canEventOverlap(existingEvent);

    // If both can overlap, it's not a real conflict
    if (newCanOverlap && existingCanOverlap) {
      continue;
    }

    // This is a conflict
    const moreImportant = compareEventImportance(newEvent, existingEvent);
    const moreFlexible = compareEventFlexibility(newEvent, existingEvent);
    const severity = calculateConflictSeverity(newEvent, existingEvent);

    conflicts.push({
      conflictingEvent: existingEvent,
      newEventMoreImportant: moreImportant === 1,
      existingEventMoreImportant: moreImportant === 2,
      equalImportance: moreImportant === 0,
      newEventMoreFlexible: moreFlexible === 1,
      existingEventMoreFlexible: moreFlexible === 2,
      equalFlexibility: moreFlexible === 0,
      newEventCanMove: canEventBeMoved(newEvent),
      existingEventCanMove: canEventBeMoved(existingEvent),
      newEventHasAttendees: hasMultipleAttendees(newEvent),
      existingEventHasAttendees: hasMultipleAttendees(existingEvent),
      severity: severity,
      overlapDuration: calculateOverlapDuration(
        newEvent.Event_Start_Date || newEvent.startDateTime,
        newEvent.Event_End_Date || newEvent.endDateTime,
        existingEvent.Event_Start_Date,
        existingEvent.Event_End_Date
      )
    });
  }

  // Sort conflicts by severity (highest first)
  conflicts.sort((a, b) => b.severity - a.severity);

  return conflicts;
}

/**
 * Calculate overlap duration in minutes
 */
function calculateOverlapDuration(start1, end1, start2, end2) {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);

  const overlapStart = s1 > s2 ? s1 : s2;
  const overlapEnd = e1 < e2 ? e1 : e2;

  const durationMs = overlapEnd - overlapStart;
  return Math.max(0, Math.round(durationMs / 60000)); // Convert to minutes
}

/**
 * Generate conflict resolution recommendations
 */
function generateResolutionRecommendation(conflict) {
  const recommendations = [];

  // Recommendation 1: Move the more flexible event
  if (conflict.existingEventMoreFlexible && conflict.existingEventCanMove) {
    recommendations.push({
      action: 'move_existing',
      reason: 'The existing event is more flexible and can be moved',
      priority: 1,
      requiresUserApproval: !conflict.existingEventHasAttendees,
      requiresEmailProposal: conflict.existingEventHasAttendees
    });
  } else if (conflict.newEventMoreFlexible && conflict.newEventCanMove) {
    recommendations.push({
      action: 'move_new',
      reason: 'The new event is more flexible and can be moved',
      priority: 1,
      requiresUserApproval: !conflict.newEventHasAttendees,
      requiresEmailProposal: conflict.newEventHasAttendees
    });
  }

  // Recommendation 2: Prioritize the more important event
  if (conflict.newEventMoreImportant && conflict.existingEventCanMove) {
    recommendations.push({
      action: 'move_existing',
      reason: 'The new event has higher priority',
      priority: 2,
      requiresUserApproval: true,
      requiresEmailProposal: conflict.existingEventHasAttendees
    });
  } else if (conflict.existingEventMoreImportant && conflict.newEventCanMove) {
    recommendations.push({
      action: 'move_new',
      reason: 'The existing event has higher priority',
      priority: 2,
      requiresUserApproval: true,
      requiresEmailProposal: conflict.newEventHasAttendees
    });
  }

  // Recommendation 3: If equal, prefer moving solo events over group events
  if (conflict.equalImportance) {
    if (!conflict.existingEventHasAttendees && conflict.existingEventCanMove) {
      recommendations.push({
        action: 'move_existing',
        reason: 'The existing event has no attendees and can be easily rescheduled',
        priority: 3,
        requiresUserApproval: true,
        requiresEmailProposal: false
      });
    } else if (!conflict.newEventHasAttendees && conflict.newEventCanMove) {
      recommendations.push({
        action: 'move_new',
        reason: 'The new event has no attendees and can be easily rescheduled',
        priority: 3,
        requiresUserApproval: true,
        requiresEmailProposal: false
      });
    }
  }

  // Sort by priority
  recommendations.sort((a, b) => a.priority - b.priority);

  return recommendations.length > 0 ? recommendations[0] : {
    action: 'user_decision',
    reason: 'Both events are equally important and inflexible. User must decide.',
    priority: 99,
    requiresUserApproval: true,
    requiresEmailProposal: false
  };
}

/**
 * Detect cascade conflicts (moving an event creates new conflicts)
 */
function detectCascadeConflicts(eventToMove, newTimeSlot, allEvents) {
  // Create a temporary version of the event at the new time
  const movedEvent = {
    ...eventToMove,
    Event_Start_Date: newTimeSlot.startDateTime,
    Event_End_Date: newTimeSlot.endDateTime
  };

  // Find conflicts at the new time
  return findConflicts(movedEvent, allEvents);
}

module.exports = {
  doEventsOverlap,
  canEventOverlap,
  canEventBeMoved,
  calculateConflictSeverity,
  compareEventImportance,
  compareEventFlexibility,
  hasMultipleAttendees,
  findConflicts,
  calculateOverlapDuration,
  generateResolutionRecommendation,
  detectCascadeConflicts
};

