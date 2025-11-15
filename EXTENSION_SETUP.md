# 🎉 Solis Chrome Extension - Setup Guide

## ✅ Changes Completed

### Deleted:
- ❌ **Entire landing page website** (frontend/landing-page/)
- ❌ **All onboarding code and flows**
- ❌ **Preferences routes** (bedtime, work hours, etc.)
- ❌ **LLM chat assistant**
- ❌ **Questionnaire interface**

### Created:
- ✅ **Chrome Extension** with OAuth built-in
- ✅ **Login-required extension** (can't access without signing in)
- ✅ **Simplified User Model** (only required fields)
- ✅ **Auto-registration** on first login

---

## 📊 New User Model (MongoDB)

```javascript
{
  Full_Name: String (from Google account),
  Email: String (from Google account),
  OAuth_Token: {
    access_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number
  },
  GCal_ID: String (primary calendar ID),
  Events: [] (empty array of Event references)
}
```

---

## 🔧 Setup Instructions

### 1. Update Backend

The backend has been updated with a new `/api/auth/register` endpoint. **Restart the backend:**

```bash
cd backend
npm run dev
```

### 2. Configure Google OAuth for Chrome Extension

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services > Credentials**
4. Click your OAuth 2.0 Client ID
5. **Copy the Client ID**

### 3. Update Extension Manifest

Open `frontend/extension/manifest.json` and replace:

```json
"oauth2": {
  "client_id": "YOUR_ACTUAL_CLIENT_ID_HERE.apps.googleusercontent.com",
  ...
}
```

### 4. Create Extension Icons

Create a simple icon (or use placeholders):

```bash
cd frontend/extension
mkdir icons
```

Create three PNG files in `icons/`:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

Or use this placeholder script:

```bash
# On Windows (PowerShell):
cd frontend/extension
mkdir icons
# Then manually create 3 small PNG files with those names
```

---

## 🚀 Load the Extension

### 1. Open Chrome Extensions Page

Go to: `chrome://extensions/`

### 2. Enable Developer Mode

Toggle the switch in the top-right corner

### 3. Click "Load unpacked"

Select the folder:
```
C:\Users\sdasa\OneDrive\Documents\GitHub\solis\frontend\extension
```

### 4. Pin the Extension

Click the puzzle piece icon (🧩) in Chrome toolbar, find "Solis", and click the pin icon

---

## 🧪 Test the Flow

### 1. Click the Solis Icon

You'll see the login screen:
- ☀️ Logo
- "Solis" heading
- "Sign in with Google" button

### 2. Click "Sign in with Google"

- Chrome OAuth popup appears
- Select your Google account
- Grant Calendar permissions
- Extension automatically:
  - Gets your name & email
  - Gets your calendar ID
  - Creates user in MongoDB
  - Saves to Chrome storage

### 3. See the App Screen

After successful login:
- User avatar with first letter of name
- Name and email displayed
- Event creation form
- Can add events to calendar

### 4. Add an Event

Fill out the form:
- Event name
- Start/end date & time
- Description
- Flexibility level
- Guests (optional)
- Click "Add to Calendar"
- Event is saved!

---

## 🔐 How Authentication Works

### First Time Login:

```
1. User clicks "Sign in with Google"
2. Chrome Identity API handles OAuth
3. Gets access token from Google
4. Fetches user info (name, email) from Google API
5. Fetches calendar ID from Google Calendar API
6. Sends all data to backend /api/auth/register
7. Backend creates user in MongoDB
8. User data saved to Chrome storage
9. App screen shown ✅
```

### Next Time Extension Opens:

```
1. Extension checks Chrome storage for user
2. If user exists → show app screen
3. If no user → show login screen
```

### Logout:

```
1. User clicks logout button
2. Removes OAuth token from Chrome
3. Clears Chrome storage
4. Back to login screen
```

---

## 📁 Extension File Structure

```
frontend/extension/
├── manifest.json      # Extension config
├── popup.html         # UI (login + app screens)
├── popup.js           # Main logic
├── background.js      # Service worker
├── styles.css         # Styling
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🎯 Features

### ✅ What Works:
- Login with Google OAuth
- Auto-create user in MongoDB
- Store user in Chrome storage
- Add events to calendar
- Conflict detection (backend)
- Logout functionality

### 🔒 Security:
- Can't access extension without login
- OAuth token stored securely in Chrome
- Backend validates all requests
- User data in MongoDB

---

## 🐛 Troubleshooting

### Issue: "OAuth2 not granted or revoked"

**Solution:** Make sure `manifest.json` has correct Client ID

### Issue: "Failed to create user in database"

**Solution:** 
1. Check backend is running (`npm run dev`)
2. Check MongoDB is connected
3. Look at backend console for errors

### Issue: Icons not showing

**Solution:** Create placeholder PNG files in `icons/` folder

### Issue: Extension won't load

**Solution:**
1. Check `manifest.json` syntax
2. Make sure all files exist
3. Check Chrome extensions page for errors

---

## ✨ Next Steps

Your extension is ready! Users can now:

1. **Install extension** from Chrome Web Store (after publishing)
2. **Sign in with Google** (one-time setup)
3. **Add events** directly from Chrome
4. **Manage calendar** easily

No website needed! No onboarding! Just simple OAuth in the extension. 🚀

---

## 📊 What Was Removed

All these are GONE:
- Landing page website
- Onboarding questionnaire
- Bedtime preferences
- Work hours setup
- Flexibility defaults
- Preferred meeting windows
- No-meeting zones
- LLM chat assistant
- Multi-step onboarding flow

**Result:** Clean, simple extension with just login + event creation! ✨

