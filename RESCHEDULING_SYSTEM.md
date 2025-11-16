# 📅 Complete Rescheduling System - How It Works

## Overview

The rescheduling system intelligently handles conflicts using:
1. **AI-powered priority comparison** (using Google Gemini)
2. **Smart slot finding** (considers work hours, preferences)
3. **Decision tree** (cancel, different day, same day)
4. **Multi-attendee flow** (email proposals & majority voting)

---

## 🤖 AI Priority Comparison

When two events conflict, Gemini AI analyzes event titles and descriptions to determine priority.

### API Endpoint:
```javascript
POST /api/reschedule-decision/analyze-conflict
Body: {
  "email": "user@example.com",
  "newEventData": {
    "title": "Coffee with John",
    "description": "Casual meetup",
    "startDateTime": "2025-11-16T10:00:00Z",
    "endDateTime": "2025-11-16T11:00:00Z",
    "attendees": []
  },
  "conflictingEventId": "evt_123..."
}
```

### Response:
```json
{
  "success": true,
  "analysis": {
    "aiPriorityComparison": {
      "higherPriorityEvent": "existing",
      "reason": "Doctor appointment is a critical health obligation that cannot be rescheduled easily",
      "confidenceLevel": "high"
    },
    "recommendation": {
      "action": "move_new_event",
      "eventToMove": {
        "id": "new",
        "name": "Coffee with John",
        "hasAttendees": false
      }
    },
    "sameDayBestSlot": {
      "startDateTime": "2025-11-16T14:00:00Z",
      "endDateTime": "2025-11-16T15:00:00Z",
      "reason": "Early afternoon - good for meetings"
    },
    "requiresEmailApproval": false
  },
  "decisionTree": {
    "step": "initial_recommendation",
    "options": [
      {
        "action": "accept_best_slot",
        "label": "Yes, move to 2:00 PM",
        "requiresEmail": false
      },
      {
        "action": "reject_and_explore",
        "label": "No, show me other options"
      }
    ]
  }
}
```

### What Gemini Considers:
- ✅ Professional obligations vs personal activities
- ✅ Meetings with others vs solo tasks
- ✅ Deadlines and time-sensitive items
- ✅ Health appointments (doctor, dentist)
- ✅ Career advancement opportunities
- ✅ Financial obligations

---

## 🌳 Decision Tree Flow

### Solo Event (No Attendees):

```
Conflict Detected
     ↓
AI Determines Lower Priority Event
     ↓
Find Best Same-Day Slot
     ↓
┌─────────────────────────────┐
│ Move to 2:00 PM today?      │
├─────────────────────────────┤
│ [Yes] → Event Moved ✅       │
│ [No]  → Broad Options ↓      │
└─────────────────────────────┘
     ↓
┌─────────────────────────────┐
│ What would you like to do?  │
├─────────────────────────────┤
│ 1. Cancel it                │
│ 2. Move to different day    │
│ 3. Keep today, different time│
└─────────────────────────────┘
     ↓
If "Different Day":
     ↓
Show Top 3 Days:
  • Monday 11/17 (5 slots available)
  • Wednesday 11/19 (7 slots available)
  • Friday 11/21 (4 slots available)
  + Manual date picker
     ↓
If "Same Day Different Time":
     ↓
Show Best 2-3 Slots:
  • 2:00 PM - 3:00 PM
  • 4:00 PM - 5:00 PM
  + Manual time picker
     ↓
User Selects → Event Moved ✅
```

### Multi-Attendee Event:

```
Conflict Detected
     ↓
AI Determines Lower Priority Event
     ↓
┌─────────────────────────────┐
│ This event has 3 attendees  │
│ Send email to propose       │
│ new time?                   │
├─────────────────────────────┤
│ [Yes] → Draft Email         │
│ [No]  → Keep Conflict       │
└─────────────────────────────┘
     ↓
AI Drafts Email:
  Subject: "Reschedule Proposal: Team Meeting"
  Body: Professional proposal with:
    • Original time
    • Proposed new time
    • Reason for change
    • Simple yes/no response options
     ↓
Email Sent to All Attendees
     ↓
Wait for Responses
     ↓
┌─────────────────────────────┐
│ Majority Vote Results:      │
│ Yes: 4 | No: 1 | Pending: 0 │
├─────────────────────────────┤
│ Majority Approved! ✅        │
└─────────────────────────────┘
     ↓
Event Rescheduled in Google Calendar
     ↓
All Attendees Notified Automatically
```

---

## 📡 API Endpoints

### 1. Analyze Conflict (with AI)
```
POST /api/reschedule-decision/analyze-conflict
```
- Uses Gemini to compare priority
- Finds best same-day slot
- Returns recommendation

### 2. Get Broad Options
```
POST /api/reschedule-decision/get-broad-options
```
- Returns decision tree: cancel, different day, same day
- Top 3 alternative days
- Best 2-3 same-day slots

### 3. Cancel Event
```
POST /api/reschedule-decision/cancel-event
```
- Deletes event
- Notifies attendees (if any) via Google Calendar

### 4. Move Manually
```
POST /api/reschedule-decision/move-manual
```
- Moves event to user-specified time
- Handles attendee notifications

### 5. Multi-Attendee Proposal
```
POST /api/reschedule/propose-multi-attendee
```
- Creates proposal in database
- AI drafts professional email
- Sends to all attendees

### 6. Record Response
```
POST /api/reschedule/record-response
```
- Records attendee yes/no/tentative
- Calculates majority vote
- Updates proposal status

### 7. Finalize Proposal
```
POST /api/reschedule/finalize-proposal
```
- Executes reschedule after majority approval
- Updates Google Calendar
- Notifies all attendees

---

## 🎯 Example Scenarios

### Scenario 1: Simple Solo Reschedule

**Input:**
- New event: "Gym" at 5:00 PM
- Conflicts with: "Dinner" at 5:00 PM
- Both solo events

**AI Analysis:**
- "Dinner is a regular necessity with some flexibility"
- "Gym can be done at various times"
- **Decision:** Move "Gym" to 6:30 PM

**Response:**
```json
{
  "recommendation": "Move Gym to 6:30 PM?",
  "options": ["Yes", "No (explore other options)"]
}
```

---

### Scenario 2: Meeting vs Doctor Appointment

**Input:**
- New event: "Team Meeting" at 2:00 PM (5 attendees)
- Conflicts with: "Doctor Appointment" at 2:00 PM (solo)

**AI Analysis:**
- "Doctor appointment is a critical health obligation"
- "Cannot be easily rescheduled"
- **Decision:** Move "Team Meeting" to 3:00 PM

**Response:**
```json
{
  "recommendation": "Move Team Meeting to 3:00 PM?",
  "requiresEmailApproval": true,
  "options": [
    "Yes, send proposal to attendees",
    "No, explore other options"
  ]
}
```

**If Yes:**
- AI drafts professional email
- Sends to 5 attendees
- Waits for responses
- If 3+ approve → Reschedule

---

### Scenario 3: User Rejects Best Slot

**Input:**
- User says "No" to suggested 3:00 PM slot

**System Shows:**
```json
{
  "broadOptions": {
    "cancel": "Cancel this event",
    "differentDay": {
      "bestDays": [
        { "date": "2025-11-17", "dayOfWeek": "Monday", "availableSlots": 5 },
        { "date": "2025-11-19", "dayOfWeek": "Wednesday", "availableSlots": 7 },
        { "date": "2025-11-21", "dayOfWeek": "Friday", "availableSlots": 4 }
      ],
      "allowManualDate": true
    },
    "sameDay": {
      "availableSlots": [
        { "startTime": "14:00", "endTime": "15:00" },
        { "startTime": "16:00", "endTime": "17:00" }
      ],
      "allowManualTime": true
    }
  }
}
```

---

## 🤝 Multi-Attendee Email Flow

### Step 1: AI Drafts Email

```
Subject: Reschedule Proposal: Team Meeting

Hi Team,

I'd like to propose rescheduling our Team Meeting.

Current time: Friday, November 15 at 2:00 PM - 3:00 PM
Proposed time: Friday, November 15 at 3:00 PM - 4:00 PM

Reason: Scheduling conflict with doctor appointment

Please reply:
- YES if you can attend the new time
- NO if you cannot

Looking forward to hearing from you!

Best regards,
[Your Name]
```

### Step 2: Track Responses

Proposal stored in MongoDB:
```javascript
{
  Proposal_ID: "prop_123...",
  Event_Name: "Team Meeting",
  Original_Time_Slot: { ... },
  Proposed_Time_Slot: { ... },
  Attendee_Responses: [
    { email: "john@example.com", status: "responded", response: "yes" },
    { email: "jane@example.com", status: "responded", response: "yes" },
    { email: "bob@example.com", status: "responded", response: "no" },
    { email: "alice@example.com", status: "responded", response: "yes" },
    { email: "charlie@example.com", status: "pending" }
  ],
  Majority_Vote_Result: {
    yesCount: 3,
    noCount: 1,
    hasMajority: true,
    decision: "approved"
  }
}
```

### Step 3: Finalize

Once majority approves:
1. Update event in Google Calendar
2. Google Calendar automatically notifies all attendees
3. Mark proposal as finalized
4. Update event in MongoDB

---

## ⚙️ Technical Implementation

### AI Priority Comparison (backend/services/rescheduler.js)

```javascript
async function compareEventPriorityWithAI(event1, event2) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `
    Event 1: ${event1.title} - ${event1.description}
    Event 2: ${event2.title} - ${event2.description}
    
    Which is more important?
  `;
  
  const result = await model.generateContent(prompt);
  // Returns: { higherPriorityEvent: 1 or 2, reason: "...", confidenceLevel: "high" }
}
```

### Decision Tree Routes (backend/routes/rescheduleDecisionTree.js)

- `/analyze-conflict` - AI analysis + best slot
- `/get-broad-options` - Cancel/different day/same day
- `/cancel-event` - Delete with notifications
- `/move-manual` - Custom time with approval

---

## 🎨 Frontend Integration

When conflict is detected in extension:

```javascript
// Step 1: Analyze conflict
const analysis = await fetch('/api/reschedule-decision/analyze-conflict', {
  method: 'POST',
  body: JSON.stringify({ email, newEventData, conflictingEventId })
});

// Step 2: Show AI recommendation
showDialog({
  message: analysis.recommendation.reason,
  options: [
    `Yes, move to ${analysis.sameDayBestSlot.startTime}`,
    'No, show me other options'
  ]
});

// Step 3: If no, get broad options
if (userSaidNo) {
  const options = await fetch('/api/reschedule-decision/get-broad-options', {
    method: 'POST',
    body: JSON.stringify({ email, eventId })
  });
  
  showDecisionTree(options);
}
```

---

## ✅ Summary

**Your rescheduling system now has:**

1. ✅ **AI Priority Comparison** - Gemini analyzes event importance
2. ✅ **Smart Slot Finding** - Considers work hours, preferences
3. ✅ **Best Slot Suggestion** - Same-day priority
4. ✅ **Decision Tree** - Cancel, different day, same day options
5. ✅ **Top 3 Days** - Ranked by availability
6. ✅ **Manual Selection** - Date/time pickers
7. ✅ **Multi-Attendee Flow** - Email proposals
8. ✅ **Majority Voting** - Tracks responses
9. ✅ **Auto-Notifications** - Via Google Calendar
10. ✅ **Complete API** - All endpoints ready

**Backend is restarted and ready to use!** 🚀

