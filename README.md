# Solis - Smart Calendar Scheduling Chrome Extension

A Google Chrome extension that helps users schedule tasks to their calendar smartly and reschedule pre-existing tasks when necessary. Integrated with Google Calendar, all edits made through the extension directly affect the user's Google Calendar.

## Tech Stack

- **Frontend**: React (Chrome Extension)
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **APIs**: Google Calendar API, Gmail API, Anthropic Claude API
- **Deployment**: Vercel
- **Authentication**: Google OAuth 2.0

## Project Structure

```
solis/
├── backend/
│   ├── config/
│   │   └── google.js          # Google OAuth configuration
│   ├── models/
│   │   ├── User.js             # User model schema
│   │   ├── Event.js            # Event model schema
│   │   └── RescheduleProposal.js # Reschedule proposal tracking
│   ├── routes/
│   │   ├── auth.js             # Authentication routes
│   │   ├── preferences.js      # User preferences routes
│   │   ├── events.js           # Event management routes
│   │   ├── conflicts.js        # Conflict detection routes
│   │   └── reschedule.js       # Event rescheduling routes
│   ├── services/
│   │   ├── llmParser.js        # LLM event parsing service
│   │   ├── calendarService.js  # Google Calendar integration
│   │   ├── conflictDetector.js # Conflict detection service
│   │   ├── rescheduler.js      # Smart rescheduling algorithms
│   │   └── emailService.js     # Email sending and tracking
│   ├── utils/
│   │   └── syncScheduler.js    # Calendar sync scheduler
│   ├── .env.example            # Environment variables template
│   ├── .gitignore              # Git ignore file
│   ├── package.json            # Backend dependencies
│   └── server.js               # Express server setup
└── README.md                   # Project documentation
```

---

## Development Progress

### ✅ Backend Step 1: Onboarding Flow (COMPLETED)

**What was implemented:**

#### 1. **Google OAuth Authentication**
- Complete OAuth 2.0 flow for Google Calendar and Gmail access
- Secure token storage and automatic refresh
- User authentication status checking
- Logout with token revocation

**Endpoints:**
- `GET /api/auth/google` - Get Google OAuth URL
- `POST /api/auth/google/callback` - Handle OAuth callback and create/update user
- `POST /api/auth/refresh-token` - Refresh expired access tokens
- `POST /api/auth/logout` - Logout and revoke Google tokens
- `GET /api/auth/status` - Check user authentication status

#### 2. **User Model**
Complete user schema with:
- Basic info: Full_Name, Email, GCal_ID
- OAuth tokens: access_token, refresh_token, expiry_date
- **Baseline Preferences:**
  - `Work_Hours`: Configurable for each day of the week
  - `Bedtime`: Separate weekday/weekend bedtime settings
  - `Preferred_Meeting_Windows`: Optimal times for scheduling meetings
  - `No_Meeting_Zones`: Times to keep free from meetings
  - `Flexibility_Defaults`: Default flexibility levels for different event types (personal_tasks, work_meetings, social_events)
- Onboarding status tracking

#### 3. **Event Model**
Complete event schema with:
- Event details: Name, Start/End Date, Start/End Time, Description
- Scheduling metadata: Priority (1-3), Flexibility (Rigid/Passive/Busy/Flexible), Type
- Guest management: Email, name, response status
- Google Calendar integration: GCal_Event_ID
- Tracking: Created_Via (extension vs direct_calendar)

#### 4. **Preferences Management**
LLM-assisted preference establishment:
- `GET /api/preferences/:email` - Retrieve user preferences
- `PUT /api/preferences/:email` - Update preferences
- `POST /api/preferences/llm-assist` - Get conversational LLM help for establishing preferences
- `POST /api/preferences/parse-preferences` - Parse natural language preferences into structured data

**LLM Features:**
- Collaborative conversation to establish baseline preferences
- Natural language parsing for work hours, bedtime, meeting windows
- Smart suggestions based on typical work patterns
- Automatic structuring of user input into database format

#### 5. **Server Setup**
- Express server with CORS configuration
- MongoDB connection with error handling
- Environment variable management
- Health check endpoint (`GET /api/health`)

---

### ✅ Backend Step 2: Event Creation - Two Methods (COMPLETED)

**What was implemented:**

#### 1. **Method 1: Via Chrome Extension with LLM Parsing**

Users can type natural language event descriptions, and the LLM automatically parses:
- Event title
- Date and time (start/end)
- Duration
- Attendees (with emails)
- Category/Event type (work, personal, social, meeting, studying, free, other)
- Flexibility level (Rigid, Passive, Busy, Flexible)
- Priority (1-3)
- Description

**Example Inputs:**
- "Coffee with John tomorrow at 3pm"
- "Team meeting next Tuesday 2-3pm with sarah@company.com and tom@company.com"
- "Dentist appointment on Friday at 10am"

**Endpoints:**
- `POST /api/events/parse` - Parse natural language input to structured event data
- `POST /api/events/create` - Create event from parsed data and add to Google Calendar

**Features:**
- Intelligent date/time parsing (handles "tomorrow", "next Monday", etc.)
- Attendee extraction from text
- Smart category assignment based on event context
- Priority assignment based on event importance
- Automatic flexibility suggestions
- Fallback to manual input if parsing fails

#### 2. **Method 2: Direct Calendar Addition with Auto-Labeling**

When users add events directly to Google Calendar (via web or mobile app), the system automatically:
- Detects new events through calendar sync
- Analyzes event title and description using LLM
- Assigns metadata (category, priority, flexibility)
- Stores in database with assigned labels

**Two Sync Approaches:**

**A. Webhook-Based (Real-time)**
- Google Calendar sends push notifications when events change
- Immediate detection of new/updated events
- Requires publicly accessible webhook URL

**B. Polling-Based (Periodic)**
- Server polls Google Calendar every 15 minutes (configurable)
- Syncs all authenticated users automatically
- No webhook setup required
- Enabled by default (can be disabled via `ENABLE_PERIODIC_SYNC=false`)

**Endpoints:**
- `POST /api/events/sync` - Manually trigger calendar sync for a user
- `GET /api/events/:email` - Get all events for a user (with optional date filters)
- `PUT /api/events/:eventId` - Update an existing event
- `DELETE /api/events/:eventId` - Delete an event
- `POST /api/events/watch/start` - Setup webhook for calendar changes
- `POST /api/events/webhook` - Webhook endpoint for Google Calendar notifications

#### 3. **Google Calendar Integration Service**

Complete calendar service with functions for:
- Creating events in Google Calendar
- Fetching events within date ranges
- Updating existing events
- Deleting events
- Setting up calendar watch (webhooks)
- Getting specific events by ID

**Features:**
- Automatic attendee notifications
- Extended properties for storing custom metadata
- Timezone support
- Reminder management
- Support for up to 2500 events per sync

#### 4. **LLM Parser Service**

Two main parsing functions:

**A. parseEventInput()**
- Parses natural language event descriptions
- Returns structured JSON with all event details
- Contextually aware of user's work hours and preferences
- Handles ambiguous inputs intelligently

**B. assignEventMetadata()**
- Analyzes event title and description
- Assigns category, priority, and flexibility
- Provides reasoning for assignments
- Falls back to defaults if parsing fails

#### 5. **Automatic Calendar Sync Scheduler**

Background service that:
- Syncs all authenticated users periodically
- Detects new events from direct calendar additions
- Updates changed events
- Rate-limit friendly (1-second delay between users)
- Configurable sync interval (default: 15 minutes)
- Syncs events from 7 days ago to 60 days in future

**Features:**
- `syncUserCalendar(email)` - Sync specific user
- `syncAllUsers()` - Sync all authenticated users
- `startPeriodicSync(interval)` - Start scheduled syncing

#### 6. **Event Management**

Full CRUD operations for events:
- Create events with validation
- Read events with date filtering
- Update events (syncs to Google Calendar)
- Delete events (removes from both DB and Calendar)
- Automatic MongoDB indexing for performance

---

### ✅ Backend Step 3: Conflict Detection (COMPLETED)

**What was implemented:**

#### 1. **Smart Conflict Detection Algorithm**

Comprehensive conflict detection that determines:
- **Time Overlap**: Precisely detects when two events overlap
- **Event Importance**: Compares priority levels (1-3) and flexibility
- **Movability**: Determines which events can be rescheduled
- **Overlap Capability**: Checks if events can coexist (based on flexibility and type)
- **Attendee Logic**: Distinguishes solo vs group events
- **Conflict Severity**: Calculates severity score (0-14 scale)

**Flexibility Rules:**
- **Rigid**: Cannot move, cannot overlap
- **Passive**: Can overlap, cannot move
- **Busy**: Can move, cannot overlap
- **Flexible**: Can move, can overlap

**Special Event Types:**
- "free" and "studying" events can always overlap with each other

#### 2. **Automatic Conflict Detection on Event Creation**

When creating a new event via `/api/events/create`:
- Automatically checks for conflicts with existing events in ±24 hour window
- Returns HTTP 409 (Conflict) if conflicts detected
- Provides detailed conflict information
- Includes AI-generated resolution recommendations
- User can skip check with `skipConflictCheck=true` parameter

**Response when conflicts found:**
```json
{
  "success": false,
  "hasConflicts": true,
  "conflictCount": 2,
  "message": "This event conflicts with 2 existing events",
  "conflicts": [ /* Array of conflicts with recommendations */ ]
}
```

#### 3. **Conflict Resolution Recommendations**

AI-powered recommendations that consider:
- Which event is more important (priority comparison)
- Which event is more flexible (flexibility comparison)
- Number of attendees (solo vs group)
- Movability of each event

**Recommendation Actions:**
- `move_existing`: Suggest moving the conflicting event
- `move_new`: Suggest moving the new event
- `user_decision`: Both equally important/inflexible - user must decide

**Recommendation includes:**
- Action to take
- Reason/explanation
- Priority ranking
- Whether user approval required
- Whether email proposal needed (for multi-attendee events)

#### 4. **Conflict Detection Endpoints**

**Endpoints:**
- `POST /api/conflicts/check` - Check if new event conflicts with existing events
- `POST /api/conflicts/check-cascade` - Check if moving an event creates new conflicts
- `POST /api/conflicts/compare` - Compare two events to determine importance/flexibility
- `GET /api/conflicts/summary/:email` - Get summary of all conflicts in user's calendar

#### 5. **Event Comparison System**

Functions to compare events:
- `compareEventImportance()`: Returns which event is more important
- `compareEventFlexibility()`: Returns which event is more flexible
- `calculateConflictSeverity()`: Quantifies how severe a conflict is

**Importance Hierarchy:**
1. Priority level (3 > 2 > 1)
2. Flexibility (Rigid > Passive > Busy > Flexible)
3. Number of attendees (more = more important)

#### 6. **Cascade Conflict Detection**

Prevents creating new conflicts when resolving existing ones:
- Checks if moving Event A to a new time slot conflicts with Event B
- Detects multi-level cascading conflicts
- Warns user before making moves that create new problems
- Essential for smart rescheduling

**Example:**
- User wants to move Event A to 2 PM
- System checks: does 2 PM conflict with any other events?
- Returns cascade conflicts if found

#### 7. **Calendar-Wide Conflict Summary**

Get overview of all conflicts in user's calendar:
- Scans all events in specified timeframe (default: next 30 days)
- Identifies all overlapping event pairs
- Calculates severity for each conflict
- Provides resolution recommendations
- Helps users clean up messy calendars

**Use case:** User can see "You have 5 conflicts in the next 30 days" with details

#### 8. **Integration with Event Creation Flow**

Seamless integration:
- Event creation automatically checks for conflicts
- Returns conflicts before actually creating the event
- User can review conflicts and decide whether to proceed
- Can force creation by setting `skipConflictCheck=true`
- Prevents accidental double-booking

---

### ✅ Backend Step 4: Event Rescheduling (COMPLETED)

**What was implemented:**

#### 1. **Smart Rescheduling Algorithm**

Intelligent time slot finder that considers:
- **User Preferences**: Work hours, bedtime, no-meeting zones, preferred meeting windows
- **Existing Events**: Avoids conflicts with current schedule
- **Scoring System**: Ranks slots by desirability (time of day, day proximity, preferred windows)
- **Flexible Search**: Same-day only, specific date, or next N days

**Features:**
- `findBestRescheduleSlot()`: Returns single best option
- `findAvailableTimeSlots()`: Returns multiple ranked options
- `findBestDaysForRescheduling()`: Returns top 3 days with available slots
- `validateRescheduleProposal()`: Validates proposed time against constraints

**Smart Scoring:**
- Prefers earlier in the day (more productive)
- Prioritizes closer to original date
- Bonus for preferred meeting windows
- Respects work hours and bedtime
- Avoids no-meeting zones

#### 2. **Solo Event Rescheduling Flow**

For events with no attendees:
- Find best available time slot automatically
- Validate against user preferences
- Update Google Calendar instantly
- Update MongoDB record
- No email coordination needed

**Endpoint:** `POST /api/reschedule/execute-solo`

**Process:**
1. Check for conflicts at new time
2. Validate against work hours/bedtime
3. Update Google Calendar
4. Update database
5. Return success confirmation

#### 3. **Multi-Attendee Event Rescheduling**

For events with attendees, implements complete email proposal workflow:

**A. Proposal Creation**
- Creates `RescheduleProposal` database record
- Generates professional email using LLM
- Sends proposal to all attendees via Gmail API
- Tracks each attendee's response status
- Sets 7-day expiration

**B. Response Tracking**
- Records yes/no/tentative responses
- Calculates majority vote in real-time
- Updates proposal status automatically
- Supports manual response recording

**C. Majority Vote Logic**
- **Approved**: More than 50% say yes
- **Rejected**: More than 50% say no
- **Mixed**: All responded but no majority
- **Pending**: Waiting for more responses

**D. Finalization**
- Requires majority approval
- Updates Google Calendar
- Updates database
- Sends confirmation emails to all attendees
- Marks proposal as finalized

#### 4. **Email Service Integration**

Complete email handling system:

**A. LLM-Generated Email Content**
- Professional, polite tone
- Clear old vs new time comparison
- Includes reason if provided
- Auto-generated subject lines
- Falls back to template if LLM fails

**B. Gmail API Integration**
- Sends emails via user's Gmail account
- Supports multiple recipients
- CC/BCC support
- Base64 encoding for Gmail API
- Returns message ID for tracking

**C. Email Types**
- **Reschedule Proposal**: Asks attendees to approve new time
- **Confirmation**: Notifies attendees of finalized reschedule
- **Custom**: Flexible email sending for various needs

#### 5. **Reschedule Proposal Model**

Database tracking for multi-attendee rescheduling:

**Schema includes:**
- Proposal ID, event ID, user email
- Original and proposed time slots
- Reason for rescheduling
- Attendee response list with statuses
- Email content and message ID
- Majority vote calculation results
- Expiration timestamp (7 days default)
- Finalization status

**Automatic tracking:**
- Who responded and when
- Yes/no/tentative counts
- Majority determination
- Proposal lifecycle (pending → approved/rejected → finalized)

#### 6. **Rescheduling Endpoints**

**Endpoints:**
- `POST /api/reschedule/find-best-slot` - Find single best reschedule slot
- `POST /api/reschedule/find-alternative-days` - Get top 3 alternative days
- `POST /api/reschedule/find-same-day-slots` - Find slots on same day
- `POST /api/reschedule/execute-solo` - Reschedule event without attendees
- `POST /api/reschedule/propose-multi-attendee` - Send proposal to attendees
- `POST /api/reschedule/record-response` - Record attendee response
- `POST /api/reschedule/finalize-proposal` - Finalize approved proposal
- `GET /api/reschedule/proposal/:proposalId` - Get proposal status

#### 7. **Decision Tree Flow Implementation**

**For Solo Events:**
1. Find best slot on same day
2. If user declines:
   - Option A: Move to different day (show top 3 days)
   - Option B: Stay same day (show best remaining times)
   - Option C: Cancel event
3. User chooses from suggestions or enters manually
4. Execute reschedule immediately

**For Multi-Attendee Events:**
1. Find best slot
2. Ask user if they want to email attendees
3. If yes:
   - Generate and send email proposal
   - Track responses
   - Calculate majority vote
   - If majority yes → finalize and notify all
   - If majority no → return to step 1 with different options
4. If no:
   - User handles rescheduling manually outside system

#### 8. **Advanced Features**

**A. Cascade Conflict Prevention**
- Before confirming reschedule, checks if new time creates conflicts
- Warns user of cascade issues
- Prevents creating new problems while solving old ones

**B. Preference-Aware Scheduling**
- Never suggests times outside work hours
- Never suggests times past bedtime
- Avoids no-meeting zones automatically
- Prioritizes preferred meeting windows

**C. Intelligent Day Selection**
- Analyzes multiple days simultaneously
- Returns days with most available slots
- Shows reasoning for each suggestion
- Groups slots by day for easy comparison

**D. Validation System**
- Validates all proposed times before accepting
- Returns specific issues (outside work hours, past bedtime, conflicts)
- Prevents invalid reschedules
- Clear error messages

---

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Google Cloud Console project with Calendar and Gmail APIs enabled
- Anthropic API key

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create `.env` file:**
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Required environment variables:
- `PORT` - Backend server port (default: 5000)
- `CLIENT_URL` - Frontend URL for OAuth redirect
- `MONGO_URI` - MongoDB connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_API_KEY` - Google API key
- `GOOGLE_CALENDAR_ID` - Calendar ID (usually 'primary')
- `ANTHROPIC_API_KEY` - Anthropic Claude API key

4. **Start the development server:**
```bash
npm run dev
```

The server will run on `http://localhost:5000` (or your specified PORT).

### Google Cloud Console Setup

1. Create a new project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the following APIs:
   - Google Calendar API
   - Gmail API
   - Google+ API (for user info)
3. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs (e.g., `http://localhost:3000/auth/callback`)
   - Copy the Client ID and Client Secret to your `.env` file

### MongoDB Setup

**Option 1: Local MongoDB**
```bash
# Install MongoDB locally and start the service
mongod
```

**Option 2: MongoDB Atlas (Cloud)**
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Add to `.env` as `MONGO_URI`

---

## API Documentation

### Authentication Endpoints

#### Get Google OAuth URL
```http
GET /api/auth/google
```
Returns the Google OAuth URL for user authentication.

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### OAuth Callback
```http
POST /api/auth/google/callback
Content-Type: application/json

{
  "code": "authorization_code_from_google"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "onboardingCompleted": false
  },
  "tokens": {
    "access_token": "...",
    "refresh_token": "...",
    "expiry_date": 1234567890
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "email": "user@example.com",
  "refreshToken": "existing_refresh_token"
}
```

#### Check Authentication Status
```http
GET /api/auth/status?email=user@example.com
```

### Preferences Endpoints

#### Get User Preferences
```http
GET /api/preferences/:email
```

**Response:**
```json
{
  "success": true,
  "preferences": {
    "workHours": {
      "monday": { "start": "09:00", "end": "17:00" },
      "tuesday": { "start": "09:00", "end": "17:00" }
      // ... other days
    },
    "bedtime": {
      "weekday": "22:00",
      "weekend": "23:00"
    },
    "preferredMeetingWindows": [],
    "noMeetingZones": [],
    "flexibilityDefaults": {
      "personal_tasks": "Flexible",
      "work_meetings": "Rigid",
      "social_events": "Busy"
    },
    "onboardingCompleted": false
  }
}
```

#### Update Preferences
```http
PUT /api/preferences/:email
Content-Type: application/json

{
  "workHours": { ... },
  "bedtime": { ... },
  "onboardingCompleted": true
}
```

#### LLM Assisted Preferences
```http
POST /api/preferences/llm-assist
Content-Type: application/json

{
  "userMessage": "I usually work 9-5 on weekdays",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "success": true,
  "message": "Great! So you work 9 AM to 5 PM Monday through Friday. What about weekends - do you work at all on Saturday or Sunday?",
  "conversationHistory": [...]
}
```

### Events Endpoints

#### Parse Natural Language Event
```http
POST /api/events/parse
Content-Type: application/json

{
  "userInput": "Coffee with John tomorrow at 3pm",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "title": "Coffee with John",
    "startDateTime": "2024-11-16 15:00",
    "endDateTime": "2024-11-16 16:00",
    "duration": 60,
    "attendees": [{"email": "", "name": "John"}],
    "flexibility": "Flexible",
    "category": "social",
    "priority": 1,
    "description": ""
  }
}
```

#### Create Event
```http
POST /api/events/create
Content-Type: application/json

{
  "email": "user@example.com",
  "eventData": {
    "title": "Team Meeting",
    "startDateTime": "2024-11-16 14:00",
    "endDateTime": "2024-11-16 15:00",
    "description": "Quarterly review",
    "priority": 3,
    "flexibility": "Rigid",
    "category": "work",
    "attendees": [
      {"email": "colleague@company.com", "name": "Sarah"}
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event created successfully",
  "event": { /* Database event object */ },
  "calendarEvent": { /* Google Calendar event object */ }
}
```

#### Sync Calendar Events
```http
POST /api/events/sync
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Calendar synced successfully",
  "stats": {
    "totalCalendarEvents": 45,
    "existingEvents": 42,
    "newEvents": 3
  },
  "newEvents": [ /* Array of newly detected events */ ]
}
```

#### Get User Events
```http
GET /api/events/:email?startDate=2024-11-01&endDate=2024-11-30
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "events": [ /* Array of events */ ]
}
```

#### Update Event
```http
PUT /api/events/:eventId
Content-Type: application/json

{
  "email": "user@example.com",
  "updates": {
    "title": "Updated Meeting Title",
    "startDateTime": "2024-11-16 15:00",
    "priority": 2
  }
}
```

#### Delete Event
```http
DELETE /api/events/:eventId
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Setup Calendar Watch
```http
POST /api/events/watch/start
Content-Type: application/json

{
  "email": "user@example.com",
  "webhookUrl": "https://your-domain.com/api/events/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Calendar watch started",
  "watch": {
    "channelId": "channel-id",
    "resourceId": "resource-id",
    "expiration": 1234567890000
  }
}
```

### Conflicts Endpoints

#### Check for Conflicts
```http
POST /api/conflicts/check
Content-Type: application/json

{
  "email": "user@example.com",
  "newEvent": {
    "title": "New Meeting",
    "startDateTime": "2024-11-16 14:00",
    "endDateTime": "2024-11-16 15:00",
    "priority": 2,
    "flexibility": "Busy",
    "category": "work",
    "attendees": []
  }
}
```

**Response (with conflicts):**
```json
{
  "success": true,
  "hasConflicts": true,
  "conflictCount": 1,
  "message": "Found 1 conflict",
  "conflicts": [
    {
      "conflictingEvent": { /* Event details */ },
      "newEventMoreImportant": false,
      "existingEventMoreImportant": true,
      "newEventCanMove": true,
      "existingEventCanMove": false,
      "severity": 8,
      "overlapDuration": 60,
      "recommendation": {
        "action": "move_new",
        "reason": "The existing event has higher priority",
        "requiresUserApproval": true
      }
    }
  ]
}
```

#### Check Cascade Conflicts
```http
POST /api/conflicts/check-cascade
Content-Type: application/json

{
  "email": "user@example.com",
  "eventId": "evt_123456",
  "newTimeSlot": {
    "startDateTime": "2024-11-16 16:00",
    "endDateTime": "2024-11-16 17:00"
  }
}
```

**Response:**
```json
{
  "success": true,
  "hasCascadeConflicts": false,
  "message": "No cascade conflicts. Safe to move event."
}
```

#### Compare Two Events
```http
POST /api/conflicts/compare
Content-Type: application/json

{
  "email": "user@example.com",
  "event1Id": "evt_123",
  "event2Id": "evt_456"
}
```

**Response:**
```json
{
  "success": true,
  "comparison": {
    "event1": { /* Event 1 details */ },
    "event2": { /* Event 2 details */ },
    "moreImportant": "event1",
    "moreFlexible": "event2",
    "recommendation": "Event 1 should take priority"
  }
}
```

#### Get Conflict Summary
```http
GET /api/conflicts/summary/:email?days=30
```

**Response:**
```json
{
  "success": true,
  "totalEvents": 45,
  "conflictCount": 3,
  "hasConflicts": true,
  "conflicts": [ /* Array of all conflicts with recommendations */ ],
  "timeRange": {
    "start": "2024-11-15T00:00:00.000Z",
    "end": "2024-12-15T00:00:00.000Z",
    "days": 30
  }
}
```

### Rescheduling Endpoints

#### Find Best Reschedule Slot
```http
POST /api/reschedule/find-best-slot
Content-Type: application/json

{
  "email": "user@example.com",
  "eventId": "evt_123",
  "sameDay": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Best slot found",
  "bestSlot": {
    "startDateTime": "2024-11-17T14:00:00.000Z",
    "endDateTime": "2024-11-17T15:00:00.000Z",
    "date": "2024-11-17",
    "startTime": "14:00",
    "endTime": "15:00",
    "score": 85,
    "reason": "Early afternoon - good for meetings; Within your preferred meeting window; Saturday availability"
  },
  "event": { /* Event details */ }
}
```

#### Find Alternative Days
```http
POST /api/reschedule/find-alternative-days
Content-Type: application/json

{
  "email": "user@example.com",
  "eventId": "evt_123",
  "searchDays": 14
}
```

**Response:**
```json
{
  "success": true,
  "bestDays": [
    {
      "date": "2024-11-18",
      "dayOfWeek": "Monday",
      "availableSlots": [ /* Top 3 slots */ ],
      "reason": "5 available time slots"
    }
    /* 2 more days */
  ]
}
```

#### Execute Solo Reschedule
```http
POST /api/reschedule/execute-solo
Content-Type: application/json

{
  "email": "user@example.com",
  "eventId": "evt_123",
  "newTimeSlot": {
    "startDateTime": "2024-11-17 15:00",
    "endDateTime": "2024-11-17 16:00"
  }
}
```

#### Propose Multi-Attendee Reschedule
```http
POST /api/reschedule/propose-multi-attendee
Content-Type: application/json

{
  "email": "user@example.com",
  "eventId": "evt_123",
  "newTimeSlot": {
    "startDateTime": "2024-11-17 15:00",
    "endDateTime": "2024-11-17 16:00"
  },
  "reason": "Conflict with another meeting"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reschedule proposal sent to attendees",
  "proposal": {
    "id": "prop_abc123",
    "status": "pending",
    "emailSent": true,
    "expiresAt": "2024-11-22T00:00:00.000Z",
    "attendeeCount": 3
  },
  "emailContent": {
    "subject": "Reschedule Proposal: Team Meeting",
    "body": "..." 
  }
}
```

#### Record Attendee Response
```http
POST /api/reschedule/record-response
Content-Type: application/json

{
  "proposalId": "prop_abc123",
  "attendeeEmail": "colleague@company.com",
  "response": "yes"
}
```

#### Finalize Proposal
```http
POST /api/reschedule/finalize-proposal
Content-Type: application/json

{
  "email": "user@example.com",
  "proposalId": "prop_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event rescheduled successfully and all attendees notified",
  "event": {
    "id": "evt_123",
    "name": "Team Meeting",
    "newStart": "2024-11-17T15:00:00.000Z",
    "newEnd": "2024-11-17T16:00:00.000Z"
  }
}
```

#### Get Proposal Status
```http
GET /api/reschedule/proposal/:proposalId?email=user@example.com
```

**Response:**
```json
{
  "success": true,
  "proposal": {
    "id": "prop_abc123",
    "eventName": "Team Meeting",
    "originalTimeSlot": { /* ... */ },
    "proposedTimeSlot": { /* ... */ },
    "status": "approved",
    "attendeeResponses": [
      {
        "email": "colleague1@company.com",
        "response": "yes",
        "status": "responded"
      }
    ],
    "majorityVoteResult": {
      "yesCount": 2,
      "noCount": 0,
      "hasMajority": true,
      "decision": "approved"
    }
  }
}
```

---

## Data Models

### User Model
```javascript
{
  Full_Name: String,
  Email: String (unique),
  Bedtime: {
    weekday: String,
    weekend: String
  },
  OAuth_Token: {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number
  },
  GCal_ID: String,
  Work_Hours: {
    monday: { start: String, end: String },
    // ... other days
  },
  Preferred_Meeting_Windows: [{
    day: String,
    start: String,
    end: String
  }],
  No_Meeting_Zones: [{
    day: String,
    start: String,
    end: String,
    description: String
  }],
  Flexibility_Defaults: {
    personal_tasks: String (Rigid/Passive/Busy/Flexible),
    work_meetings: String,
    social_events: String
  },
  Onboarding_Completed: Boolean
}
```

### Event Model
```javascript
{
  ID: String (unique),
  User_Email: String,
  Event_Name: String,
  Event_Start_Date: Date,
  Event_End_Date: Date,
  Start_Time: String,
  End_Time: String,
  Event_Description: String,
  Event_Priority: Number (1-3),
  Event_Flexibility: String (Rigid/Passive/Busy/Flexible),
  Event_Type: String (work/personal/social/meeting/studying/free/other),
  Event_Guests: [{
    email: String,
    name: String,
    responseStatus: String
  }],
  GCal_Event_ID: String,
  Created_Via: String (extension/direct_calendar)
}
```

---

## Flexibility System

The app uses a 4-level flexibility system:

1. **Rigid**: Event cannot be moved AND cannot be overlapped
2. **Passive**: Event can be overlapped but CANNOT be moved
3. **Busy**: Event can be moved but CANNOT be overlapped
4. **Flexible**: Event can be both moved AND overlapped

---

## Next Steps

### ✅ Backend Step 2: Event Creation (COMPLETED)
- ✅ Implemented event creation via Chrome extension with LLM parsing
- ✅ Set up Google Calendar API integration for direct calendar additions
- ✅ Created LLM parsing for natural language event input
- ✅ Implemented event listening via webhooks and periodic polling
- ✅ Full CRUD operations for event management

### ✅ Backend Step 3: Conflict Detection (COMPLETED)
- ✅ Built comprehensive conflict detection algorithm
- ✅ Implemented priority and flexibility comparison
- ✅ Handle multi-event conflicts with severity scoring
- ✅ Distinguished solo vs multi-attendee logic
- ✅ Automatic conflict checking on event creation
- ✅ Cascade conflict detection
- ✅ AI-powered resolution recommendations

### ✅ Backend Step 4: Event Rescheduling (COMPLETED)
- ✅ Implemented smart rescheduling algorithm with preference-aware time finding
- ✅ Built email proposal system for multi-attendee events with LLM email generation
- ✅ Created response tracking and majority vote logic
- ✅ Handled cascade conflicts prevention
- ✅ Solo event instant rescheduling
- ✅ Complete decision tree flow implementation

### 🔜 Frontend Development (NEXT)
- Set up React Chrome extension structure
- Implement all UI components
- Apply Notion-inspired styling
- Build conflict resolution flows

---

## Testing

Test cases are defined in the project proposal document. Each feature will be tested according to the specified test cases before moving to the next development step.

---

## License

ISC

---

## Notes

- Each development step is completed one at a time
- README is updated after each completed step
- All authentication tokens are securely stored and encrypted
- OAuth tokens automatically refresh when expired
- LLM assistance uses Claude Sonnet 4 for natural language processing

---

**Last Updated:** Backend Step 4 completed - All backend development complete!
**Current Status:** Ready for Frontend Development - Chrome Extension UI

