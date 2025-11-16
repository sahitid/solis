# 🚀 Rescheduling System - Quick Start Guide

## ✅ What Was Built

You now have a **complete, intelligent rescheduling system** that handles conflicts using:

1. **🤖 AI-Powered Priority Analysis** - Gemini compares event importance
2. **🎯 Smart Slot Finding** - Finds best available times
3. **🌳 Decision Tree** - Cancel, different day, or same day options
4. **📧 Multi-Attendee Flow** - Email proposals with majority voting
5. **⚡ Real-time Integration** - Works with Google Calendar

---

## 📡 New API Endpoints

### Decision Tree Endpoints (`/api/reschedule-decision/`)

| Endpoint | Purpose | Solo | Multi-Attendee |
|----------|---------|------|----------------|
| `/analyze-conflict` | AI comparison + best slot | ✅ | ✅ |
| `/get-broad-options` | Cancel/different day/same day | ✅ | ✅ |
| `/cancel-event` | Delete with notifications | ✅ | ✅ |
| `/move-manual` | Custom time with approval | ✅ | ✅ |

### Multi-Attendee Endpoints (`/api/reschedule/`)

| Endpoint | Purpose |
|----------|---------|
| `/propose-multi-attendee` | Create & send proposal |
| `/record-response` | Track attendee votes |
| `/finalize-proposal` | Execute after approval |
| `/find-best-slot` | Find optimal time |
| `/find-alternative-days` | Top 3 days |
| `/find-same-day-slots` | Same-day options |

---

## 🎮 How to Use

### Step 1: Detect Conflict

When creating an event in your extension, the conflict detection endpoint returns:

```json
{
  "hasConflicts": true,
  "conflicts": [
    {
      "conflictingEvent": {
        "id": "evt_123...",
        "name": "Doctor Appointment",
        "startDate": "2025-11-16T14:00:00Z"
      }
    }
  ]
}
```

### Step 2: Analyze with AI

Call the analyze endpoint:

```javascript
POST /api/reschedule-decision/analyze-conflict
Body: {
  "email": "user@example.com",
  "newEventData": {
    "title": "Coffee with John",
    "description": "Casual meetup",
    "startDateTime": "2025-11-16T14:00:00Z",
    "endDateTime": "2025-11-16T15:00:00Z",
    "attendees": []
  },
  "conflictingEventId": "evt_123..."
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "aiPriorityComparison": {
      "higherPriorityEvent": "existing",
      "reason": "Doctor appointment is a critical health obligation",
      "confidenceLevel": "high"
    },
    "recommendation": {
      "action": "move_new_event",
      "eventToMove": {
        "name": "Coffee with John"
      }
    },
    "sameDayBestSlot": {
      "startDateTime": "2025-11-16T16:00:00Z",
      "startTime": "16:00",
      "reason": "Early afternoon - good for meetings"
    }
  }
}
```

### Step 3: Show User Dialog

```
┌─────────────────────────────────────────────┐
│ ⚠️  Scheduling Conflict                     │
├─────────────────────────────────────────────┤
│                                             │
│ Your new event "Coffee with John" conflicts │
│ with "Doctor Appointment"                   │
│                                             │
│ AI Recommendation:                          │
│ Doctor appointment is a critical health     │
│ obligation that cannot be easily            │
│ rescheduled.                                │
│                                             │
│ Best alternative:                           │
│ Move "Coffee with John" to 4:00 PM today    │
│                                             │
│ [ Yes, move to 4:00 PM ]  [ Show options ]  │
└─────────────────────────────────────────────┘
```

### Step 4A: If User Accepts

```javascript
// User clicked "Yes"
POST /api/reschedule-decision/move-manual
Body: {
  "email": "user@example.com",
  "eventId": "new", // or existing event ID
  "newTimeSlot": {
    "startDateTime": "2025-11-16T16:00:00Z",
    "endDateTime": "2025-11-16T17:00:00Z"
  },
  "userApproved": true
}
```

**Result:** Event scheduled at new time ✅

### Step 4B: If User Rejects

```javascript
// User clicked "Show options"
POST /api/reschedule-decision/get-broad-options
Body: {
  "email": "user@example.com",
  "eventId": "evt_123..."
}
```

**Response:**
```json
{
  "success": true,
  "options": {
    "cancel": {
      "action": "cancel_event",
      "label": "Cancel this event"
    },
    "differentDay": {
      "action": "move_different_day",
      "bestDays": [
        {
          "date": "2025-11-17",
          "dayOfWeek": "Monday",
          "availableSlots": [
            { "startTime": "09:00", "endTime": "10:00" },
            { "startTime": "14:00", "endTime": "15:00" }
          ]
        },
        {
          "date": "2025-11-19",
          "dayOfWeek": "Wednesday",
          "availableSlots": [ ... ]
        }
      ]
    },
    "sameDay": {
      "action": "move_same_day",
      "availableSlots": [
        { "startTime": "16:00", "endTime": "17:00" },
        { "startTime": "17:30", "endTime": "18:30" }
      ]
    }
  }
}
```

Show user:

```
┌─────────────────────────────────────────────┐
│ What would you like to do?                  │
├─────────────────────────────────────────────┤
│                                             │
│ 🗑️  Cancel it                               │
│                                             │
│ 📅 Move to a different day:                 │
│   • Monday 11/17 (5 slots available)        │
│   • Wednesday 11/19 (7 slots available)     │
│   • Friday 11/21 (4 slots available)        │
│   + Choose date manually                    │
│                                             │
│ 🕐 Keep today but different time:           │
│   • 4:00 PM - 5:00 PM                       │
│   • 5:30 PM - 6:30 PM                       │
│   + Enter time manually                     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📧 Multi-Attendee Flow

### When Event Has Attendees:

```
┌─────────────────────────────────────────────┐
│ ⚠️  This event has 3 attendees              │
├─────────────────────────────────────────────┤
│                                             │
│ Moving this event will send a reschedule    │
│ proposal email to all attendees.            │
│                                             │
│ Proposed new time:                          │
│ Friday, November 15 at 4:00 PM - 5:00 PM    │
│                                             │
│ [ Send Proposal ]  [ Cancel ]               │
└─────────────────────────────────────────────┘
```

**If user approves:**

```javascript
POST /api/reschedule/propose-multi-attendee
Body: {
  "email": "user@example.com",
  "eventId": "evt_123...",
  "newTimeSlot": {
    "startDateTime": "2025-11-15T16:00:00Z",
    "endDateTime": "2025-11-15T17:00:00Z"
  },
  "reason": "Scheduling conflict"
}
```

**AI drafts email:**

```
Subject: Reschedule Proposal: Team Meeting

Hi Team,

I'd like to propose rescheduling our Team Meeting.

Current time: Friday, November 15 at 2:00 PM - 3:00 PM
Proposed time: Friday, November 15 at 4:00 PM - 5:00 PM

Reason: Scheduling conflict

Please reply with YES or NO.

Best regards,
[Your Name]
```

**Email sent to all attendees** → System waits for responses

### Tracking Responses:

```javascript
// Backend automatically tracks responses
// Or manually record:
POST /api/reschedule/record-response
Body: {
  "proposalId": "prop_123...",
  "attendeeEmail": "john@example.com",
  "response": "yes" // or "no" or "tentative"
}
```

### When Majority Approves:

```javascript
POST /api/reschedule/finalize-proposal
Body: {
  "email": "user@example.com",
  "proposalId": "prop_123..."
}
```

**Result:**
- Event rescheduled in Google Calendar
- All attendees notified automatically
- Database updated

---

## 🧪 Test the System

Run the test script:

```bash
cd backend
node test-reschedule-system.js
```

**Expected output:**
```
╔══════════════════════════════════════════════════╗
║   RESCHEDULING SYSTEM TEST                       ║
╚══════════════════════════════════════════════════╝

🤖 Testing AI Priority Comparison...

✅ Parsed Result:
   Higher Priority: Event 2 (Doctor Appointment)
   Reason: Doctor appointment is a critical health obligation
   Confidence: high

🤖 Testing Another Scenario...

✅ Parsed Result:
   Higher Priority: Event 1 (Client Meeting)
   Reason: Client meeting involves multiple stakeholders
   Confidence: high

╔══════════════════════════════════════════════════╗
║   TEST SUMMARY                                   ║
╚══════════════════════════════════════════════════╝
Scenario 1 (Coffee vs Doctor): ✅ PASSED
Scenario 2 (Client Meeting vs Lunch): ✅ PASSED

🎉 All tests passed!
```

---

## 📝 Example User Flow

### Complete Example: New Event with Conflict

1. **User creates event in extension:**
   - "Gym Session" at 5:00 PM - 6:00 PM

2. **Conflict detected:**
   - Conflicts with "Dinner with Family" at 5:00 PM

3. **AI analyzes:**
   - Dinner with family is higher priority (social/family time)
   - Gym can be rescheduled more easily

4. **System suggests:**
   - "Move Gym to 6:30 PM today?"

5. **User clicks "Yes":**
   - Event created at 6:30 PM
   - No conflicts
   - Done! ✅

### Alternative Flow:

1-3. (Same as above)

4. **User clicks "Show options"**

5. **System shows:**
   - Cancel
   - Different day (Monday, Wednesday, Friday)
   - Same day (6:30 PM, 8:00 PM)

6. **User selects "Wednesday at 5:00 PM"**

7. **Event created:**
   - Scheduled for Wednesday
   - Done! ✅

---

## 🎯 Key Features

| Feature | Status | Details |
|---------|--------|---------|
| AI Priority Comparison | ✅ | Uses Gemini to analyze importance |
| Same-Day Best Slot | ✅ | Finds optimal time today |
| Decision Tree | ✅ | Cancel/different day/same day |
| Top 3 Days | ✅ | Ranked by availability |
| Manual Selection | ✅ | Custom date/time |
| Multi-Attendee Emails | ✅ | AI-drafted proposals |
| Majority Voting | ✅ | Tracks responses |
| Auto-Notifications | ✅ | Via Google Calendar |
| Real-time Sync | ✅ | Updates instantly |

---

## 📖 Full Documentation

See `RESCHEDULING_SYSTEM.md` for complete technical details.

---

## 🚀 Ready to Use!

Your backend is running with all reschedule endpoints active:
- `http://localhost:5000/api/reschedule-decision/*`
- `http://localhost:5000/api/reschedule/*`

**Next step:** Integrate these endpoints into your Chrome extension popup! 🎨

