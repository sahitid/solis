# ☀️ Solis - Smart Calendar Scheduling

> A Chrome extension that intelligently schedules and reschedules events to your Google Calendar using AI.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB Atlas account
- Google Cloud Console project with Calendar API enabled
- Google Gemini API key

### Setup in 3 Steps

1. **Clone and Install**
```bash
git clone <your-repo-url>
cd solis
cd backend
npm install
```

2. **Configure Backend**
```bash
# In backend directory, create .env file
cp .env.example .env
# Edit .env and add your API keys
```

3. **Start Backend**
```bash
cd backend
npm run dev
```

4. **Load Chrome Extension**
- Open Chrome and go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select `frontend/extension/` folder
- Update `manifest.json` with your Google OAuth Client ID

---

## 📖 Documentation

### Quick Start & Usage
- **[FRONTEND_INTEGRATION_COMPLETE.md](FRONTEND_INTEGRATION_COMPLETE.md)** - ⭐ **START HERE!** Complete user guide
- **[RESCHEDULE_QUICK_START.md](RESCHEDULE_QUICK_START.md)** - Quick start guide for rescheduling

### Technical Documentation
- **[RESCHEDULING_SYSTEM.md](RESCHEDULING_SYSTEM.md)** - Complete API reference & technical details
- **[REFACTOR_SUMMARY.md](REFACTOR_SUMMARY.md)** - What changed in recent refactor

---

## ✨ Features

### Chrome Extension
- 🔐 **Login Required** - Secure OAuth authentication
- 📅 **Add Events** - Create calendar events with ease
- 🎯 **Flexibility Levels** - Rigid, Passive, Busy, or Flexible
- 👥 **Multi-Attendee** - Invite guests to events
- 🎨 **Modern UI** - Notion-inspired design

### Backend
- 🤖 **AI Event Parsing** - Natural language understanding with Gemini
- ⚠️ **Conflict Detection** - Automatically detect scheduling conflicts
- 🔄 **Smart Rescheduling** - Intelligent rescheduling for solo and multi-attendee events
- 📧 **Email Integration** - Send reschedule proposals via Gmail
- 🔗 **Calendar Sync** - Real-time sync with Google Calendar

---

## 🏗️ Architecture

### Tech Stack
- **Frontend:** Chrome Extension (HTML, CSS, JavaScript)
- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas
- **APIs:** Google Calendar, Gmail, Gemini AI
- **Authentication:** Chrome Identity API (OAuth 2.0)

### File Structure
```
solis/
├── backend/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   └── server.js        # Express server
│
├── frontend/
│   └── extension/       # Chrome extension
│       ├── manifest.json
│       ├── popup.html
│       ├── popup.js
│       ├── background.js
│       ├── styles.css
│       └── icons/
│
└── docs/                # Documentation
```

---

## 🔧 Configuration

### Backend Environment Variables
Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=your_mongodb_atlas_connection_string

# Google APIs
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/callback
GOOGLE_API_KEY=your_google_api_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Features
ENABLE_PERIODIC_SYNC=true
SYNC_INTERVAL_MINUTES=15
```

### Extension Configuration
Update `frontend/extension/manifest.json`:

```json
{
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    ...
  }
}
```

---

## 📊 User Model

After login, users are automatically created in MongoDB:

```javascript
{
  Full_Name: String,      // From Google account
  Email: String,          // From Google account
  OAuth_Token: {          // OAuth credentials
    access_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number
  },
  GCal_ID: String,       // Primary calendar ID
  Events: [ObjectId]     // References to Event documents
}
```

---

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register/update user
- `GET /api/auth/user?email=...` - Get user by email

### Events
- `POST /api/events/create` - Create new event
- `GET /api/events/:email` - Get user's events

### Conflicts
- `POST /api/conflicts/detect` - Detect scheduling conflicts

### Rescheduling
- `POST /api/reschedule/solo` - Reschedule solo events
- `POST /api/reschedule/multi-attendee` - Reschedule multi-attendee events

---

## 🧪 Testing

### Test Backend
```bash
cd backend
npm test
```

### Test Extension
1. Load extension in Chrome
2. Click extension icon
3. Sign in with Google
4. Create a test event
5. Check Google Calendar

---

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB connection string
- Verify all API keys in `.env`
- Ensure port 5000 is available

### Extension won't load
- Check `manifest.json` for errors
- Verify Google Client ID is correct
- Look for errors in `chrome://extensions/`

### OAuth not working
- Confirm Google Cloud Console has Calendar API enabled
- Check OAuth redirect URI matches
- Ensure correct scopes are requested

---

## 🚀 Deployment

### Backend (Example: Heroku)
```bash
heroku create solis-backend
heroku config:set MONGO_URI=...
heroku config:set GEMINI_API_KEY=...
git push heroku main
```

### Extension (Chrome Web Store)
1. Create a ZIP of `frontend/extension/`
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload ZIP
4. Fill out listing details
5. Submit for review

---

## 📝 Recent Changes

### v2.0 - Major Refactor
- ✅ Removed landing page website
- ✅ Removed onboarding process
- ✅ Simplified User model (5 fields instead of 11)
- ✅ OAuth moved into Chrome extension
- ✅ Login now required before using extension
- ✅ Auto-create user on first login

See [REFACTOR_SUMMARY.md](REFACTOR_SUMMARY.md) for details.

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👥 Authors

- Your Name - Initial work

---

## 🙏 Acknowledgments

- Google Calendar API
- Google Gemini AI
- MongoDB Atlas
- Chrome Extensions API

---

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check documentation in `/docs`
- See troubleshooting guides

---

**Made with ☀️ by the Solis team**
