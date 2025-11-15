# Solis Landing Page

## Overview

This is the main landing page and web interface for Solis - a smart calendar scheduling application.

## Features

### Header Component
- ☀️ Logo and branding
- 🏠 Home tab navigation
- ⚙️ Settings tab navigation
- 👤 User profile indicator (when logged in)
- 🔐 Login/Logout functionality
- ✨ Active tab highlighting

### Home Tab
- Hero section with value proposition
- Feature cards showcasing key capabilities
- Call-to-action section

### Settings Tab

#### 1. Google Account Section
- 🔑 Google sign-in button with OAuth flow
- 📊 Display connected account information
- ✅ Calendar and Gmail connection status indicators
- 🔄 Reconnect option
- 🔌 Disconnect option

#### 2. Onboarding Preferences with LLM Assistant
- 🤖 **AI Chat Assistant**: Conversational interface to help set up preferences
- 📝 **Manual Configuration**: Comprehensive form for all preferences

**Preference Categories:**
- ⏰ **Work Hours**: Configure start/end times for each day of the week
- 🌙 **Bedtime**: Set typical bedtime and wake-up time
- 🕐 **Meeting Windows**: Define preferred time slots for meetings
- 🚫 **No-Meeting Zones**: Block off times when meetings shouldn't be scheduled
- 🎯 **Flexibility Defaults**: Set default flexibility levels for different event categories
  - Work events
  - Personal tasks
  - Meetings
  - Social events

#### 3. Calendar Permissions
- ✅ Google Calendar API permission status
- ✅ Gmail API permission status
- 📊 Real-time permission indicators

#### 4. Save Preferences
- 💾 Save preferences to MongoDB backend
- 🔄 Update existing preferences
- ⚡ Real-time form validation
- 🎨 Beautiful loading states

## Setup

### 1. Backend Connection

Make sure your backend server is running:

```bash
cd backend
npm run dev
```

The landing page expects the backend at `http://localhost:5000/api`.

### 2. Open the Landing Page

Simply open `index.html` in your browser:

```bash
cd frontend/landing-page
# Open index.html in your browser
```

Or use a local server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js (http-server)
npx http-server -p 8080
```

Then navigate to `http://localhost:8080`

### 3. Google OAuth Setup

The landing page uses the same Google OAuth setup as the Chrome extension. Make sure you've configured:

1. Google Cloud Project
2. OAuth 2.0 credentials
3. Authorized redirect URIs
4. `.env` file in backend with OAuth credentials

## File Structure

```
landing-page/
├── index.html       # Main HTML structure
├── styles.css       # Notion-inspired styling
├── app.js          # JavaScript functionality
└── README.md       # This file
```

## Key Functionality

### Authentication Flow

1. User clicks "Sign in with Google"
2. Backend generates OAuth URL
3. Opens OAuth flow in popup window
4. User authorizes Google Calendar and Gmail
5. Backend receives tokens and stores in database
6. Frontend updates UI to show logged-in state
7. Loads user preferences from backend

### LLM Chat Assistant

The AI assistant helps users set up preferences through natural conversation:

```
User: "I work Monday to Friday, 9 AM to 5 PM"
AI: "Great! I've set your work hours. What about your bedtime?"
User: "I usually sleep around 11 PM and wake up at 7 AM"
AI: "Perfect! When do you prefer to have meetings?"
```

The assistant:
- Uses Google Gemini API for natural language understanding
- Maintains conversation context
- Automatically updates the form with extracted preferences
- Provides helpful suggestions

### Preferences Storage

Preferences are saved to MongoDB via the backend API:

```javascript
POST /api/preferences
{
  "email": "user@example.com",
  "preferences": {
    "workHours": { ... },
    "bedtime": "22:00",
    "meetingWindows": [ ... ],
    ...
  }
}
```

## API Endpoints Used

- `GET /api/auth/url` - Get OAuth URL
- `GET /api/auth/status` - Check auth status
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/permissions` - Check Calendar/Gmail permissions
- `POST /api/preferences/llm-assist` - Chat with LLM assistant
- `GET /api/preferences` - Load user preferences
- `PUT /api/preferences` - Save user preferences

## Styling

The landing page uses a Notion-inspired design system:

- **Colors**:
  - Primary: `#2383e2` (Blue)
  - Background: `#ffffff` (White)
  - Secondary BG: `#f7f6f3` (Light Gray)
  - Text: `#37352f` (Dark Gray)
  - Muted Text: `#787774` (Gray)

- **Typography**:
  - System font stack for native feel
  - Clear hierarchy with h1-h5
  - Consistent spacing

- **Components**:
  - Rounded corners (6-12px)
  - Subtle shadows
  - Smooth transitions
  - Hover states on all interactive elements

## Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Edge
- ✅ Firefox
- ✅ Safari

## Next Steps

After setting up preferences, users can:

1. Install the Chrome extension
2. Add events through the extension
3. Let the AI handle conflict detection
4. Receive smart reschedule suggestions
5. Send reschedule proposals via email

## Support

For issues or questions, please check:
- Backend logs at `backend/npm run dev`
- Browser console for frontend errors
- MongoDB connection status
- Google OAuth configuration

