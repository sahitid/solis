# Step 2: Baseline Preferences with LLM - Implementation Guide

## 🎯 Goal

Help users establish three key preferences through collaborative conversation with an LLM:

1. **Typical Work Hours** - What days and times they work
2. **Bedtime** - When they sleep (to avoid late-night scheduling)
3. **Flexibility Defaults** - How flexible different event types should be

---

## ✅ What Was Implemented

### 1. Enhanced LLM Assistant

**Backend: `backend/routes/preferences.js`**

The LLM assistant now:
- ✅ Focuses on the three key preferences
- ✅ Asks questions one at a time
- ✅ Uses a warm, conversational tone
- ✅ Automatically extracts preferences from conversation
- ✅ Updates user database in real-time
- ✅ Provides clear explanations of flexibility levels

**Key Features:**
```javascript
- Guided conversation flow (work hours → bedtime → flexibility)
- Automatic preference extraction using Gemini
- Real-time database updates
- Preference validation
- Conversation history tracking
```

### 2. Improved Frontend Chat Interface

**Frontend: `frontend/landing-page/app.js`**

The chat interface now:
- ✅ Shows what will be asked upfront
- ✅ Sends user email with messages
- ✅ Updates form automatically when preferences extracted
- ✅ Shows success notifications
- ✅ Scrolls to updated form fields
- ✅ Maintains conversation context

**Enhanced Features:**
```javascript
- Visual feedback when preferences update
- Smart form synchronization
- Smooth scrolling to changes
- Clear success messages
```

### 3. Updated Initial Greeting

**Frontend: `frontend/landing-page/index.html`**

New welcome message:
```
Hi! 👋 I'm here to help you set up your calendar preferences.

I'll ask you about three key things:
1️⃣ Your typical work hours
2️⃣ Your bedtime
3️⃣ How flexible different types of events should be

Let's start: What are your typical work hours?
```

---

## 🧪 How to Test

### Method 1: Automated Test Script

```bash
cd backend
node test-preferences-llm.js
```

This script simulates a full onboarding conversation and shows:
- Each message exchange
- Extracted preferences
- Database updates
- Conversation flow

### Method 2: Manual Testing via Landing Page

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Landing Page:**
   ```bash
   cd frontend/landing-page
   npx http-server -p 8080
   ```

3. **Open in Browser:**
   - Go to http://localhost:8080
   - Click "Sign in with Google" (or go to Settings tab)
   - Use the chat assistant on the left

4. **Test Conversation:**
   ```
   You: "Hi, ready to set up"
   Bot: Welcomes you, asks about work hours
   
   You: "I work Monday to Friday, 9 AM to 5 PM"
   Bot: Acknowledges, asks about bedtime
   
   You: "I go to bed around 11 PM"
   Bot: Acknowledges, asks about flexibility
   
   You: "Work meetings are rigid, personal tasks are flexible"
   Bot: Confirms, suggests saving preferences
   ```

5. **Verify:**
   - Check that form fields update automatically
   - Click "Save Preferences"
   - Refresh page and verify preferences persist

---

## 💬 Example Conversation Flow

```
🤖 Assistant:
Hi! 👋 I'm here to help you set up your calendar preferences.
What are your typical work hours?

👤 User:
I work Monday through Friday, 9 AM to 5 PM

🤖 Assistant:
Great! So you work 9 AM to 5 PM on weekdays. 
What time do you usually go to bed?

👤 User:
Around 11 PM on weekdays, midnight on weekends

🤖 Assistant:
Perfect! Now, let's set up flexibility defaults.
For work meetings, should they be rigid (can't move or overlap) 
or more flexible?

👤 User:
Work meetings should be rigid. Personal tasks can be flexible.

🤖 Assistant:
Excellent! I've updated your preferences:
- Work hours: Mon-Fri 9 AM to 5 PM
- Bedtime: 11 PM weekdays, midnight weekends
- Work meetings: Rigid
- Personal tasks: Flexible

Go ahead and click "Save Preferences" to finish!
```

---

## 🔍 Technical Details

### Preference Extraction

The system uses Gemini to extract structured data:

**Input:** Natural language conversation
```
"I work Monday to Friday, 9 AM to 5 PM"
```

**Output:** Structured JSON
```json
{
  "workHours": {
    "monday": {"start": "09:00", "end": "17:00"},
    "tuesday": {"start": "09:00", "end": "17:00"},
    "wednesday": {"start": "09:00", "end": "17:00"},
    "thursday": {"start": "09:00", "end": "17:00"},
    "friday": {"start": "09:00", "end": "17:00"}
  }
}
```

### Database Updates

Preferences are saved to User model:
```javascript
{
  Work_Hours: {
    monday: { start: "09:00", end: "17:00" },
    // ... other days
  },
  Bedtime: {
    weekday: "23:00",
    weekend: "00:00"
  },
  Flexibility_Defaults: {
    personal_tasks: "Flexible",
    work_meetings: "Rigid",
    social_events: "Busy"
  }
}
```

---

## 🎨 Flexibility Levels Explained

The LLM explains these to users during conversation:

| Level | Can Move? | Can Overlap? | Example Use Case |
|-------|-----------|--------------|------------------|
| **Rigid** | ❌ | ❌ | Important meetings, appointments |
| **Passive** | ❌ | ✅ | Watching a livestream |
| **Busy** | ✅ | ❌ | Focused work blocks |
| **Flexible** | ✅ | ✅ | Flexible personal tasks |

---

## 📊 API Endpoints Used

### POST /api/preferences/llm-assist

**Request:**
```json
{
  "userMessage": "I work Monday to Friday, 9 to 5",
  "conversationHistory": [],
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "assistantMessage": "Great! So you work 9 AM to 5 PM...",
  "conversationHistory": [...],
  "preferences": {
    "workHours": {...}
  }
}
```

### PUT /api/preferences

**Request:**
```json
{
  "email": "user@example.com",
  "preferences": {
    "workHours": {...},
    "bedtime": {...},
    "flexibilityDefaults": {...}
  }
}
```

---

## ✅ Testing Checklist

- [ ] Backend server running (`npm run dev`)
- [ ] Landing page accessible (http://localhost:8080)
- [ ] Chat assistant responds to messages
- [ ] Work hours extracted correctly
- [ ] Bedtime extracted correctly
- [ ] Flexibility defaults extracted correctly
- [ ] Form updates automatically
- [ ] Success notifications appear
- [ ] Preferences save to database
- [ ] Preferences persist after refresh

---

## 🐛 Troubleshooting

### Issue: "LLM assist error"
**Solution:** Check that GEMINI_API_KEY is set in `.env`

### Issue: "Form not updating"
**Solution:** Check browser console for errors, verify email is set

### Issue: "Preferences not saving"
**Solution:** Check MongoDB connection, verify user is authenticated

### Issue: "Conversation not flowing"
**Solution:** Check Gemini API quota, verify model name is correct

---

## 🎯 Success Criteria

Step 2 is complete when:
1. ✅ User can chat with LLM assistant
2. ✅ Assistant asks about work hours, bedtime, flexibility
3. ✅ Preferences automatically extracted from conversation
4. ✅ Form updates in real-time
5. ✅ Preferences save to database
6. ✅ User sees clear confirmation

---

## 📝 Next Steps

After Step 2 is tested and working:

**Step 3: Mark Onboarding Complete**
- Set `Onboarding_Completed = true` when preferences saved
- Redirect to main app/extension
- Show welcome message to new users

---

## 🚀 Ready to Test!

Run the test script:
```bash
cd backend
node test-preferences-llm.js
```

Or test manually at:
```
http://localhost:8080
```

---

**Status: Ready for Testing** ⏳  
**Next: Verify conversation flow and preference extraction**

