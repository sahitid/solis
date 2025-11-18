# ☀️ Solis - Smart Calendar Scheduling

A Chrome extension that uses AI to schedule and reschedule events on your Google Calendar.

---

## Quick Start

**Prerequisites:**
- Node.js (v14+)
- MongoDB Atlas account
- Google Cloud Console project with Calendar API enabled
- Google Gemini API key

**Setup:**
```bash
# Clone and install
git clone <your-repo-url>
cd solis/backend
npm install

# Configure backend
cp .env.example .env
# Add your API keys to .env

# Start backend
npm run dev
```

**Load Chrome Extension:**
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `frontend/extension/` folder
4. Update `manifest.json` with your Google OAuth Client ID

## What It Does

**Chrome Extension:**
- Secure OAuth login
- Create calendar events naturally
- Set flexibility levels (Rigid, Passive, Busy, Flexible)
- Invite guests to events
- Notion-inspired UI

**Backend:**
- AI-powered event parsing (Gemini)
- Automatic conflict detection
- Smart rescheduling (solo & multi-attendee)
- Email rescheduling proposals (Gmail)
- Real-time Google Calendar sync

---

## Architecture

**Stack:** Node.js, Express, MongoDB, Google Calendar/Gmail APIs, Gemini AI
```
solis/
├── backend/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── utils/           # Helpers
│   └── server.js
│
├── frontend/extension/  # Chrome extension files
│   ├── manifest.json
│   ├── popup.html/js
│   ├── background.js
│   └── styles.css
│
└── docs/
```

---

## Configuration

**Backend `.env`:**
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
GEMINI_API_KEY=your_gemini_key
```

**Extension `manifest.json`:**
```json
{
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
  }
}
```

---

## User Model

Users are auto-created on first login:
```javascript
{
  Full_Name: String,
  Email: String,
  OAuth_Token: { access_token, scope, token_type, expiry_date },
  GCal_ID: String,
  Events: [ObjectId]
}
```

---

## API Endpoints

**Auth:**
- `POST /api/auth/register` - Register/update user
- `GET /api/auth/user?email=...` - Get user

**Events:**
- `POST /api/events/create` - Create event
- `GET /api/events/:email` - Get user's events

**Conflicts:**
- `POST /api/conflicts/detect` - Detect conflicts

**Rescheduling:**
- `POST /api/reschedule/solo` - Solo events
- `POST /api/reschedule/multi-attendee` - Multi-attendee events

---

## Troubleshooting

**Backend won't start:**
- Check MongoDB connection string
- Verify API keys in `.env`
- Ensure port 5000 is available

**Extension won't load:**
- Check `manifest.json` syntax
- Verify Google Client ID
- Check `chrome://extensions/` for errors

**OAuth issues:**
- Enable Calendar API in Google Cloud Console
- Match OAuth redirect URI
- Verify scopes

---

## Recent Changes (v2.0)

- Removed landing page & onboarding
- Simplified User model (5 fields)
- OAuth now in Chrome extension
- Login required before use
- Auto-create user on first login

---

## License

MIT License
