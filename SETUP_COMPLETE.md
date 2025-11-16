# ✅ Solis Setup Guide

## What's Already Done ✅

1. ✅ Repository cloned
2. ✅ Backend dependencies installed (`npm install` in backend/)
3. ✅ `.env` file created with all your API keys
4. ✅ Extension `manifest.json` updated with your Google Client ID
5. ✅ Fixed sync error handling for invalid OAuth tokens

---

## 🚀 Final Setup Steps

### Step 1: Start the Backend Server

Open a terminal and run:

```bash
cd /Users/laasyachevendra/RealSolis/backend
npm run dev
```

You should see:
```
✅ MongoDB Atlas connected successfully
Server running on port 5000
Starting periodic calendar sync every 15 minutes
```

**Note:** You may see a message about skipping a test user - that's normal and expected.

---

### Step 2: Load the Chrome Extension

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/` in your Chrome browser
   - Or: Chrome Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension
   - Click the "Load unpacked" button
   - Navigate to: `/Users/laasyachevendra/RealSolis/frontend/extension`
   - Click "Select"

4. **Verify Extension Loaded**
   - You should see "Solis - Smart Calendar" in your extensions list
   - The extension icon should appear in your Chrome toolbar

---

### Step 3: Test the Extension

1. **Click the Extension Icon**
   - Click the Solis icon in your Chrome toolbar
   - The popup should open

2. **Sign In with Google**
   - Click "Sign in with Google"
   - Complete the OAuth flow
   - Grant calendar permissions

3. **Create a Test Event**
   - Fill out the event form
   - Click "Add to Calendar"
   - Check your Google Calendar to verify it was created

---

## 🔧 Configuration Summary

### Backend (.env)
- ✅ MongoDB Atlas: Connected
- ✅ Google OAuth: Configured
- ✅ Google API Key: Set
- ✅ Gemini API: Configured
- ✅ Server Port: 5000

### Extension (manifest.json)
- ✅ Google Client ID: `795507657670-dscd98jn4r637ha3vt0anof9djrsjimi.apps.googleusercontent.com`
- ✅ API Endpoint: `http://localhost:5000/api`
- ✅ Permissions: Calendar, User Info

---

## 🧪 Quick Test

Once both are running:

1. **Backend Health Check**
   ```bash
   curl http://localhost:5000/api/health
   ```
   Should return: `{"status":"Server is running","timestamp":"..."}`

2. **Extension Test**
   - Open extension popup
   - Sign in
   - Create an event
   - Verify in Google Calendar

---

## 🐛 Troubleshooting

### Backend won't start
- **Port 5000 in use?** Change `PORT` in `.env` to another port (e.g., 5001)
- **MongoDB connection error?** Check your `MONGO_URI` in `.env`
- **Missing dependencies?** Run `npm install` in `backend/` directory

### Extension won't load
- **Manifest errors?** Check `chrome://extensions/` for error messages
- **OAuth not working?** Verify Client ID matches in `manifest.json` and Google Cloud Console
- **API errors?** Make sure backend is running on port 5000

### OAuth Errors
- **"invalid_grant"?** This is normal for test users - they're automatically skipped
- **"redirect_uri_mismatch"?** Check Google Cloud Console OAuth settings
- **No permissions?** Make sure Calendar API is enabled in Google Cloud Console

---

## 📝 Next Steps

1. **Start Backend**: `cd backend && npm run dev`
2. **Load Extension**: Chrome → Extensions → Load unpacked → Select `frontend/extension`
3. **Test**: Sign in and create an event

---

## 🎉 You're All Set!

The Solis extension is ready to use. The backend will automatically:
- Sync your calendar every 15 minutes
- Detect conflicts when creating events
- Use AI to suggest rescheduling options

Enjoy your smart calendar! ☀️

