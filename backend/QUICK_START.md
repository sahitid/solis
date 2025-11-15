# Quick Start Guide - Backend

## Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
```

## Required Environment Variables

Create a `.env` file in the `backend` directory with:

```env
# Server
PORT=5000
CLIENT_URL=http://localhost:3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/solis

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_API_KEY=your_api_key_here
GOOGLE_CALENDAR_ID=primary

# Anthropic API (Get from Anthropic Console)
ANTHROPIC_API_KEY=your_anthropic_key_here

# Calendar Sync Settings
ENABLE_PERIODIC_SYNC=true

# Webhook Token (Optional, for Google Calendar push notifications)
GOOGLE_WEBHOOK_VERIFICATION_TOKEN=your_webhook_token_here
```

## Getting API Keys

### Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable APIs: Google Calendar API, Gmail API, Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3000/auth/callback`
6. Copy Client ID and Client Secret

### Anthropic API
1. Go to https://console.anthropic.com/
2. Create an API key
3. Copy the key to your `.env` file

### MongoDB
**Option 1: Local**
```bash
# Install and run MongoDB locally
mongod
# Connection string: mongodb://localhost:27017/solis
```

**Option 2: Cloud (MongoDB Atlas)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Add to `.env`

## Running the Server

Development mode (auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will run on http://localhost:5000

## Testing the API

### 1. Check server health
```bash
curl http://localhost:5000/api/health
```

### 2. Get Google OAuth URL
```bash
curl http://localhost:5000/api/auth/google
```

### 3. Test authentication flow
Visit the returned `authUrl` in your browser, complete OAuth, then use the code in callback.

## File Structure

```
backend/
├── config/
│   └── google.js           # Google OAuth setup
├── models/
│   ├── User.js             # User schema
│   └── Event.js            # Event schema
├── routes/
│   ├── auth.js             # Auth endpoints
│   └── preferences.js      # Preferences endpoints
├── .env                    # Your secrets (DO NOT COMMIT)
├── .env.example            # Template
├── server.js               # Main server file
└── package.json            # Dependencies
```

## Available Endpoints

### Authentication
- `GET /api/auth/google` - Get OAuth URL
- `POST /api/auth/google/callback` - OAuth callback
- `POST /api/auth/refresh-token` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check auth status

### Preferences
- `GET /api/preferences/:email` - Get preferences
- `PUT /api/preferences/:email` - Update preferences
- `POST /api/preferences/llm-assist` - LLM conversation
- `POST /api/preferences/parse-preferences` - Parse natural language

### Events
- `POST /api/events/parse` - Parse natural language event
- `POST /api/events/create` - Create event in Google Calendar
- `POST /api/events/sync` - Sync calendar events
- `GET /api/events/:email` - Get user's events
- `PUT /api/events/:eventId` - Update event
- `DELETE /api/events/:eventId` - Delete event
- `POST /api/events/watch/start` - Setup calendar webhooks
- `POST /api/events/webhook` - Webhook endpoint

### Conflicts
- `POST /api/conflicts/check` - Check for conflicts
- `POST /api/conflicts/check-cascade` - Check cascade conflicts
- `POST /api/conflicts/compare` - Compare two events
- `GET /api/conflicts/summary/:email` - Get conflict summary

### Rescheduling
- `POST /api/reschedule/find-best-slot` - Find best time slot
- `POST /api/reschedule/find-alternative-days` - Get alternative days
- `POST /api/reschedule/find-same-day-slots` - Find same-day slots
- `POST /api/reschedule/execute-solo` - Reschedule solo event
- `POST /api/reschedule/propose-multi-attendee` - Send proposal
- `POST /api/reschedule/record-response` - Record response
- `POST /api/reschedule/finalize-proposal` - Finalize reschedule
- `GET /api/reschedule/proposal/:id` - Get proposal status

### Health
- `GET /api/health` - Server health check

## Features

### Automatic Calendar Sync
- By default, the server syncs all users' calendars every 15 minutes
- Detects new events added directly to Google Calendar
- Assigns metadata (category, priority, flexibility) using LLM
- To disable: set `ENABLE_PERIODIC_SYNC=false` in `.env`

### Two Ways to Add Events
1. **Via Extension**: User types natural language → LLM parses → Creates event
2. **Direct Calendar**: User adds to Google Calendar → Server detects → Assigns labels

### Webhook Support
- Can setup push notifications from Google Calendar
- Requires publicly accessible URL
- Alternative to polling-based sync

## Common Issues

### MongoDB Connection Error
- Make sure MongoDB is running
- Check connection string in `.env`
- For Atlas: whitelist your IP address

### OAuth Error
- Verify Google Cloud Console setup
- Check redirect URI matches exactly
- Ensure APIs are enabled

### Token Expired
- Use `/api/auth/refresh-token` endpoint
- Tokens auto-refresh when possible

## Next Steps

✅ Backend Step 1: Complete (OAuth, preferences)
✅ Backend Step 2: Complete (Event creation, calendar sync)
✅ Backend Step 3: Complete (Conflict detection)
✅ Backend Step 4: Complete (Event rescheduling, email proposals)

🎉 All backend development complete!

Next: Frontend - Chrome extension UI

