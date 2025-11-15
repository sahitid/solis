# 🔍 Conflict Detection System - How It Works

## 📋 Overview

The conflict detection system analyzes scheduling conflicts based on **time overlap**, **flexibility**, **priority**, and **attendees**. It provides smart recommendations for resolving conflicts.

---

## 🔑 Key Concepts

### 1. Flexibility Levels

```javascript
Rigid:    ❌ Can't overlap, ❌ Can't move
Passive:  ✅ Can overlap,  ❌ Can't move
Busy:     ❌ Can't overlap, ✅ Can move
Flexible: ✅ Can overlap,  ✅ Can move
```

### 2. Special Event Types

- **"free"** and **"studying"** events can always overlap with each other
- These are considered low-priority, background activities

### 3. Priority Levels

- **1**: Low priority
- **2**: Medium priority (default)
- **3**: High priority

---

## 🔍 How Conflicts Are Detected

### Step 1: Time Overlap Check

```javascript
function doEventsOverlap(event1Start, event1End, event2Start, event2End) {
  const start1 = new Date(event1Start);
  const end1 = new Date(event1End);
  const start2 = new Date(event2Start);
  const end2 = new Date(event2End);
  
  // Events overlap if one starts before the other ends
  // and the other starts before the first one ends
  return start1 < end2 && start2 < end1;
}
```

**Example:**
```
Event A: 10:00 AM - 12:00 PM
Event B: 11:00 AM - 1:00 PM
Result: ✅ OVERLAP (11:00 AM - 12:00 PM)
```

---

### Step 2: Can They Overlap?

```javascript
function canEventOverlap(event) {
  const flexibility = event.Event_Flexibility;
  const eventType = event.Event_Type;
  
  // Special types can always overlap
  if (eventType === 'free' || eventType === 'studying') {
    return true;
  }
  
  // Check flexibility
  return flexibility === 'Passive' || flexibility === 'Flexible';
}
```

**Rules:**
- If **BOTH** events can overlap → ✅ No conflict
- If **ONE OR BOTH** cannot overlap → ⚠️ Conflict detected

---

### Step 3: Calculate Conflict Severity

```javascript
function calculateConflictSeverity(event1, event2) {
  let severity = 0;
  
  // Priority difference (0-6 points)
  severity += Math.abs(priority1 - priority2) * 2;
  
  // Flexibility difference (0-3 points)
  severity += Math.abs(flexValue1 - flexValue2);
  
  // Attendees (0-5 points)
  if (both have attendees) severity += 5;
  else if (one has attendees) severity += 3;
  
  return severity;
}
```

**Severity Scale:**
- **0-3**: Minor conflict (easy to resolve)
- **4-7**: Moderate conflict (requires attention)
- **8+**: Major conflict (difficult to resolve)

---

## 🎯 Conflict Resolution Logic

### 1. Compare Importance

```javascript
function compareEventImportance(event1, event2) {
  // Step 1: Compare priority
  if (priority1 > priority2) return 1; // Event 1 more important
  if (priority2 > priority1) return 2; // Event 2 more important
  
  // Step 2: Compare flexibility (less flexible = more important)
  if (flex1 > flex2) return 1;
  if (flex2 > flex1) return 2;
  
  // Step 3: Compare attendees (more attendees = more important)
  if (attendees1 > attendees2) return 1;
  if (attendees2 > attendees1) return 2;
  
  return 0; // Equal
}
```

---

### 2. Generate Recommendations

The system provides **3 levels** of recommendations:

#### Priority 1: Move the More Flexible Event

```javascript
if (existingEvent is more flexible AND can move) {
  → Recommend: "Move existing event"
  → Reason: "More flexible and can be moved"
}
```

#### Priority 2: Prioritize Higher Priority Event

```javascript
if (newEvent has higher priority AND existingEvent can move) {
  → Recommend: "Move existing event"
  → Reason: "New event has higher priority"
}
```

#### Priority 3: Prefer Moving Solo Events

```javascript
if (events are equal importance) {
  if (existingEvent has no attendees AND can move) {
    → Recommend: "Move existing event"
    → Reason: "No attendees, easy to reschedule"
  }
}
```

---

## 📊 Example Scenarios

### Scenario 1: Simple Conflict

```javascript
New Event:
  - Time: 2:00 PM - 3:00 PM
  - Flexibility: "Flexible"
  - Priority: 2
  - Attendees: None

Existing Event:
  - Time: 2:30 PM - 4:00 PM
  - Flexibility: "Rigid"
  - Priority: 3
  - Attendees: 5 people

RESULT:
✅ Conflict detected
📊 Severity: 8 (high)
💡 Recommendation: "Move new event"
   Reason: "Existing event is more important (higher priority, more attendees, rigid)"
```

---

### Scenario 2: No Conflict (Both Can Overlap)

```javascript
New Event:
  - Time: 10:00 AM - 12:00 PM
  - Flexibility: "Flexible"
  - Type: "studying"

Existing Event:
  - Time: 11:00 AM - 1:00 PM
  - Flexibility: "Passive"
  - Type: "free"

RESULT:
✅ No conflict
   Reason: "Both events can overlap"
```

---

### Scenario 3: Equal Events (User Decision)

```javascript
New Event:
  - Time: 3:00 PM - 4:00 PM
  - Flexibility: "Rigid"
  - Priority: 3
  - Attendees: 3 people

Existing Event:
  - Time: 3:30 PM - 5:00 PM
  - Flexibility: "Rigid"
  - Priority: 3
  - Attendees: 3 people

RESULT:
⚠️ Conflict detected
📊 Severity: 5 (moderate)
💡 Recommendation: "User must decide"
   Reason: "Both events equally important and inflexible"
```

---

## 🛠️ API Endpoints

### 1. Check Conflicts for New Event

```http
POST /api/conflicts/check
Body: {
  "email": "user@example.com",
  "newEvent": {
    "title": "Meeting",
    "startDateTime": "2025-11-16T14:00:00Z",
    "endDateTime": "2025-11-16T15:00:00Z",
    "flexibility": "Busy",
    "priority": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "hasConflicts": true,
  "conflictCount": 1,
  "conflicts": [{
    "conflictingEvent": { ... },
    "severity": 8,
    "overlapDuration": 30,
    "recommendation": {
      "action": "move_new",
      "reason": "Existing event has higher priority",
      "requiresUserApproval": true
    }
  }]
}
```

---

### 2. Check Cascade Conflicts

```http
POST /api/conflicts/check-cascade
Body: {
  "email": "user@example.com",
  "eventId": "event123",
  "newTimeSlot": {
    "startDateTime": "2025-11-16T16:00:00Z",
    "endDateTime": "2025-11-16T17:00:00Z"
  }
}
```

**Use Case:** Check if moving an event to a new time creates new conflicts.

---

### 3. Get Conflict Summary

```http
GET /api/conflicts/summary/:email?days=30
```

**Returns:** All conflicts in the user's calendar for the next 30 days.

---

## 🎯 When Conflicts Are Checked

### Automatic Checking

1. **When creating a new event** (unless `skipConflictCheck: true`)
2. **When moving an event** to a new time slot
3. **During periodic sync** (checks for changes from Google Calendar)

### Code Location:

```javascript
// In backend/routes/events.js (line 76-108)
if (!skipConflictCheck) {
  // Get events in time range (±1 day)
  const existingEvents = await Event.find({
    User_Email: email,
    Event_Start_Date: { $gte: searchStart, $lte: searchEnd }
  });

  // Format new event
  const formattedNewEvent = {
    Event_Start_Date: eventData.startDateTime,
    Event_End_Date: eventData.endDateTime,
    Event_Priority: eventData.priority || 2,
    Event_Flexibility: eventData.flexibility || 'Busy',
    // ...
  };

  // Find conflicts
  const conflicts = findConflicts(formattedNewEvent, existingEvents);

  if (conflicts.length > 0) {
    return res.status(409).json({
      error: 'Conflict detected',
      conflicts: conflicts
    });
  }
}
```

---

## 💡 Smart Features

### 1. Overlap Duration Calculation

Shows **how much** the events overlap (in minutes).

```javascript
Event A: 2:00 PM - 4:00 PM
Event B: 3:00 PM - 5:00 PM
Overlap: 60 minutes (3:00 PM - 4:00 PM)
```

---

### 2. Multi-Attendee Detection

Events with attendees require:
- ✉️ **Email proposals** for rescheduling
- 👥 **Coordination** with all participants
- ⚠️ **Higher severity** in conflict scoring

---

### 3. Cascade Conflict Detection

Before moving an event, checks if the new time creates **new conflicts**.

```javascript
Original: Event at 2:00 PM conflicts with Event A
Proposed: Move to 4:00 PM
Check: Does 4:00 PM conflict with any other events?
```

---

## 📁 Code Files

### Core Logic
- **`backend/services/conflictDetector.js`** - Main conflict detection algorithms
- **`backend/routes/conflicts.js`** - API endpoints for conflict checking
- **`backend/routes/events.js`** - Event creation with conflict checking

### Models
- **`backend/models/Event.js`** - Event schema with flexibility, priority fields

---

## 🎯 Summary

The conflict detection system is **smart** and **context-aware**:

✅ Considers **flexibility** (can events overlap or move?)  
✅ Considers **priority** (which event is more important?)  
✅ Considers **attendees** (harder to move group events)  
✅ Calculates **severity** (how bad is the conflict?)  
✅ Provides **recommendations** (what should be done?)  
✅ Detects **cascade conflicts** (will moving create new problems?)

**Result:** Intelligent scheduling that respects your preferences and constraints! 🚀

