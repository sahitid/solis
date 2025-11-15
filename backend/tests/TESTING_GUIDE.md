

# Solis Backend Testing Guide

This guide explains how to test the Solis backend API to verify all functionality works as intended.

## Prerequisites

Before running tests, ensure you have:

1. **MongoDB Running**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or verify MongoDB Atlas connection string in .env
   ```

2. **Environment Variables Set**
   - Copy `.env.example` to `.env` in the `backend` directory
   - Fill in all required API keys:
     - `ANTHROPIC_API_KEY` (required for LLM tests)
     - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (for OAuth tests)
     - `MONGO_URI` (MongoDB connection string)

3. **Dependencies Installed**
   ```bash
   cd backend
   npm install
   ```

4. **Server Running**
   ```bash
   npm run dev
   ```
   Server should be running on `http://localhost:5000`

## Running Tests

### Option 1: Run All Tests
```bash
cd backend/tests
node run-all-tests.js
```

This runs all test suites in sequence and provides a comprehensive report.

### Option 2: Run Individual Test Suites

**Authentication & Preferences:**
```bash
node test-auth.js
```

**Event Creation & Management:**
```bash
node test-events.js
```

**Conflict Detection:**
```bash
node test-conflicts.js
```

**Event Rescheduling:**
```bash
node test-reschedule.js
```

## Expected Test Results

### Test Suite 1: Authentication & Preferences (5 tests)

**Test 1: Server Health Check**
- ✓ Should return 200 status
- ✓ Should return `{ status: 'Server is running', timestamp: ... }`

**Test 2: Get OAuth URL**
- ✓ Should return 200 status
- ✓ Should return auth URL starting with `https://accounts.google.com`

**Test 3: Check Auth Status (Unauthenticated)**
- ✓ Should return 200 status
- ✓ `authenticated` should be `false` for non-existent user

**Test 4: LLM Preference Assistance**
- ✓ Should return 200 status
- ✓ Should return conversational response from Claude
- ✓ Response should be helpful and contextual
- ⚠️ Requires valid `ANTHROPIC_API_KEY`

**Test 5: Parse Preferences from Natural Language**
- ✓ Should return 200 status
- ✓ Should parse work hours, bedtime, meeting windows, no-meeting zones
- ✓ Should return structured JSON format
- ⚠️ Requires valid `ANTHROPIC_API_KEY`

**Expected Pass Rate:** 100% (if API keys are valid)

---

### Test Suite 2: Event Creation & Management (5 tests)

**Test 1: Parse Simple Event**
- ✓ Input: "Coffee with John tomorrow at 3pm"
- ✓ Should extract: title, start time, end time, category, priority
- ✓ Should categorize as "social", low priority
- ⚠️ Requires `ANTHROPIC_API_KEY`

**Test 2: Parse Complex Event with Attendees**
- ✓ Input: "Team meeting next Tuesday 2-3pm with sarah@company.com..."
- ✓ Should extract multiple attendees with emails
- ✓ Should categorize as "meeting" or "work"
- ✓ Should calculate duration correctly (60 minutes)
- ⚠️ Requires `ANTHROPIC_API_KEY`

**Test 3: Parse Ambiguous Event**
- ✓ Input: "Dentist appointment Friday morning"
- ✓ LLM should infer reasonable time (e.g., 9-10 AM)
- ✓ Should categorize as "personal"
- ⚠️ Requires `ANTHROPIC_API_KEY`

**Test 4: Get User Events**
- ⚠️ Expected to return 404 or 401 if user not authenticated
- ✓ This is the correct behavior for security

**Test 5: Event Validation**
- ✓ Should reject event with missing required fields
- ✓ Should return 400 Bad Request
- ✓ Error message should specify what's missing

**Expected Pass Rate:** 100% (if API keys are valid)

---

### Test Suite 3: Conflict Detection (5 tests)

**Test 1: No Conflict Detection**
- ✓ Should successfully check for conflicts
- ✓ Should return `hasConflicts: false` when no overlap
- ⚠️ May return 404 if test user doesn't exist (expected)

**Test 2: Event Comparison Logic**
- ✓ Verifies priority comparison works correctly
- ✓ Higher priority (3) > Lower priority (1)
- ✓ More rigid > More flexible
- ✓ More attendees = more important

**Test 3: Flexibility Rules**
- ✓ Verifies overlap rules are correctly defined
- ✓ Rigid & Busy cannot overlap
- ✓ Passive & Flexible can overlap
- ✓ "free" and "studying" can overlap

**Test 4: Cascade Conflict Detection**
- ✓ Should check if moving event creates new conflicts
- ⚠️ May return 404 if test event doesn't exist (expected)

**Test 5: Conflict Summary**
- ✓ Should scan user's calendar for conflicts
- ✓ Should return count and details
- ⚠️ May return 404 if test user doesn't exist (expected)

**Expected Pass Rate:** 100%

---

### Test Suite 4: Event Rescheduling (6 tests)

**Test 1: Find Best Reschedule Slot**
- ✓ Should find optimal time slot
- ✓ Should consider user preferences
- ✓ Should return slot with score and reasoning
- ⚠️ May return 404 if test event doesn't exist (expected)

**Test 2: Find Alternative Days**
- ✓ Should return top 3 alternative days
- ✓ Each day should show available slots
- ⚠️ May return 404 if test event doesn't exist (expected)

**Test 3: Find Same-Day Slots**
- ✓ Should return slots on the same day
- ✓ Should limit to requested max (e.g., 3 slots)
- ⚠️ May return 404 if test event doesn't exist (expected)

**Test 4: Rescheduling Logic**
- ✓ Verifies scoring algorithm works correctly
- ✓ Prefers productive hours (morning/early afternoon)
- ✓ Respects all user constraints

**Test 5: Email Proposal System**
- ✓ Verifies email workflow is implemented
- ✓ LLM generates professional emails
- ✓ Majority vote logic works correctly

**Test 6: Decision Tree Flow**
- ✓ Verifies solo event flow
- ✓ Verifies multi-attendee flow
- ✓ All decision branches implemented

**Expected Pass Rate:** 100%

---

## Manual Testing with Postman/Insomnia

For more interactive testing, use these endpoints:

### 1. Test Health Check
```
GET http://localhost:5000/api/health
```

### 2. Test OAuth URL Generation
```
GET http://localhost:5000/api/auth/google
```

### 3. Test Event Parsing
```
POST http://localhost:5000/api/events/parse
Content-Type: application/json

{
  "userInput": "Lunch with Sarah tomorrow at noon",
  "email": "test@example.com"
}
```

### 4. Test Conflict Detection
```
POST http://localhost:5000/api/conflicts/check
Content-Type: application/json

{
  "email": "test@example.com",
  "newEvent": {
    "title": "New Meeting",
    "startDateTime": "2024-11-20T14:00:00Z",
    "endDateTime": "2024-11-20T15:00:00Z",
    "priority": 2,
    "flexibility": "Busy",
    "category": "work"
  }
}
```

### 5. Test Rescheduling
```
POST http://localhost:5000/api/reschedule/find-best-slot
Content-Type: application/json

{
  "email": "test@example.com",
  "eventId": "your_event_id",
  "sameDay": false
}
```

## Troubleshooting

### Tests Fail with "ECONNREFUSED"
- **Problem:** Server not running
- **Solution:** Start server with `npm run dev` in backend directory

### Tests Fail with "Anthropic API Error"
- **Problem:** Invalid or missing `ANTHROPIC_API_KEY`
- **Solution:** Get API key from https://console.anthropic.com/ and add to `.env`

### Tests Fail with "MongoDB Connection Error"
- **Problem:** MongoDB not running or wrong connection string
- **Solution:** 
  - Start local MongoDB: `mongod`
  - Or verify MongoDB Atlas connection string in `.env`

### Tests Fail with 404 "User not found"
- **Problem:** This is expected for many tests without full OAuth flow
- **Solution:** These are not actual failures - the code correctly returns 404 for non-existent users

### LLM Tests Give Different Results
- **Note:** LLM responses may vary slightly between runs
- **This is normal:** The responses should be semantically similar even if wording differs

## Test Coverage

Our test suites cover:

- ✅ Authentication & OAuth flows
- ✅ User preferences management
- ✅ LLM-powered natural language parsing
- ✅ Event CRUD operations
- ✅ Conflict detection algorithms
- ✅ Resolution recommendations
- ✅ Smart rescheduling logic
- ✅ Email proposal system
- ✅ Majority voting
- ✅ Decision tree flows
- ✅ Validation and error handling

## Next Steps After Testing

Once all tests pass:

1. **Verify with real Google OAuth**
   - Complete OAuth flow in browser
   - Verify tokens are stored correctly
   - Test with real Google Calendar

2. **Test Gmail Integration**
   - Send test reschedule proposal
   - Verify emails are sent
   - Test response tracking

3. **Integration Testing**
   - Test complete workflows end-to-end
   - Verify data persistence
   - Test edge cases

4. **Proceed to Frontend Development**
   - All backend APIs are ready
   - Documentation is complete
   - Ready for Chrome extension UI

## Support

If you encounter issues not covered here:
1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB is accessible
4. Confirm API keys are valid

