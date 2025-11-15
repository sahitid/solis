# 🚀 Final Setup Steps - Solis Chrome Extension

## ✅ What's Been Done

1. **Deleted landing page** - All website code removed
2. **Removed onboarding** - No more questionnaires or preferences
3. **Simplified User Model** - Only essential fields (Full_Name, Email, OAuth_Token, GCal_ID, Events)
4. **Created Chrome Extension** with OAuth authentication
5. **Updated backend** - New `/api/auth/register` endpoint
6. **Generated placeholder icons** - Basic icons created
7. **Fixed CORS** - Backend now accepts Chrome extension requests

---

## 📝 3 Steps to Complete Setup

### Step 1: Get Your Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services > Credentials**
4. Find your OAuth 2.0 Client ID
5. **COPY** the Client ID (looks like: `123456789-abc.apps.googleusercontent.com`)

### Step 2: Update manifest.json

Open: `frontend/extension/manifest.json`

Find this line:

```json
"client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
```

Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID from Step 1.

**Example:**
```json
"client_id": "123456789-abc.apps.googleusercontent.com",
```

Save the file.

### Step 3: Load Extension in Chrome

1. **Open Chrome** and go to: `chrome://extensions/`

2. **Enable Developer Mode**
   - Toggle the switch in the top-right corner

3. **Click "Load unpacked"**
   - Navigate to and select: `C:\Users\sdasa\OneDrive\Documents\GitHub\solis\frontend\extension`
   - Click "Select Folder"

4. **Verify it loaded**
   - You should see "Solis - Smart Calendar" in the extensions list
   - If there are errors, check the console

5. **Pin the extension**
   - Click the puzzle piece icon (🧩) in Chrome toolbar
   - Find "Solis" and click the pin icon
   - The Solis icon will appear in your toolbar

---

## 🧪 Testing the Extension

### 1. Open the Extension

Click the Solis icon in your Chrome toolbar

**Expected:** You see the login screen with:
- ☀️ Logo
- "Solis" heading
- "Sign in with Google" button

### 2. Sign In

1. Click "Sign in with Google"
2. Chrome OAuth popup appears
3. Select your Google account
4. Grant permissions for Calendar access

**Expected:** After login:
- App screen appears
- Your name and email are displayed
- Event creation form is visible

### 3. Check MongoDB

After successful login, check your MongoDB database:

```javascript
// The extension should have created a user document with:
{
  Full_Name: "Your Name",
  Email: "your.email@gmail.com",
  OAuth_Token: { access_token: "...", ... },
  GCal_ID: "your.calendar.id@gmail.com",
  Events: []
}
```

### 4. Create an Event

Fill out the event form:
- **Event Name:** "Test Event"
- **Start Date/Time:** Tomorrow at 10:00 AM
- **End Date/Time:** Tomorrow at 11:00 AM
- **Description:** "Testing the extension"
- **Flexibility:** Select "Flexible"
- Click **"Add to Calendar"**

**Expected:**
- ✅ Success message appears
- Event is created in your Google Calendar
- Backend logs show the event creation

---

## 🎯 What Happens on Login

```
User clicks "Sign in with Google"
         ↓
Chrome Identity API handles OAuth
         ↓
Gets access token from Google
         ↓
Fetches user profile (name, email)
         ↓
Fetches Calendar ID from Google Calendar API
         ↓
Sends data to: POST http://localhost:5000/api/auth/register
         ↓
Backend creates/updates user in MongoDB
         ↓
User data saved to Chrome storage
         ↓
App screen shown ✅
```

---

## 🐛 Troubleshooting

### Issue: "OAuth2 not granted"

**Cause:** Incorrect Client ID in manifest.json

**Fix:** 
1. Double-check your Client ID from Google Cloud Console
2. Make sure it ends with `.apps.googleusercontent.com`
3. Update `manifest.json`
4. Click "Reload" on the extension in `chrome://extensions/`

### Issue: "Failed to create user in database"

**Cause:** Backend not running or MongoDB not connected

**Fix:**
1. Make sure backend is running: `cd backend; npm run dev`
2. Check console for MongoDB connection success
3. Verify `.env` has correct `MONGO_URI`

### Issue: Extension won't load

**Cause:** File errors or missing manifest

**Fix:**
1. Go to `chrome://extensions/`
2. Look for error messages on the Solis card
3. Click "Errors" to see details
4. Common issues:
   - Missing files (check all files exist)
   - Syntax error in manifest.json
   - Missing icons (should be generated already)

### Issue: Icons look weird

**Cause:** Using placeholder icons

**Fix:** This is expected! The placeholders work for testing. See `CREATE_ICONS.md` for creating proper icons.

---

## ✅ Success Checklist

Before considering setup complete, verify:

- [ ] Backend running on `http://localhost:5000`
- [ ] MongoDB connected (see ✅ in backend console)
- [ ] manifest.json updated with correct Client ID
- [ ] Extension loaded in Chrome (no errors)
- [ ] Extension icon visible in Chrome toolbar
- [ ] Can click icon and see login screen
- [ ] Can sign in with Google successfully
- [ ] User created in MongoDB after login
- [ ] Can see app screen after login
- [ ] Can create a test event
- [ ] Event appears in Google Calendar

---

## 🎉 You're Done!

Once all checkboxes above are complete, your Solis extension is fully functional!

**What you can do now:**
- Add events from Chrome
- Check for conflicts automatically
- Manage your calendar seamlessly
- No website needed, no onboarding required

**Next steps (optional):**
- Create better icons (see CREATE_ICONS.md)
- Publish to Chrome Web Store
- Share with friends!

---

## 📊 File Structure

```
solis/
├── backend/
│   ├── models/User.js          ← Simplified (5 fields only)
│   ├── routes/auth.js          ← New /register endpoint
│   ├── routes/events.js        ← Event creation
│   ├── routes/conflicts.js     ← Conflict detection
│   ├── routes/reschedule.js    ← Rescheduling logic
│   └── server.js               ← Updated CORS for Chrome
│
└── frontend/
    └── extension/              ← NEW: Chrome Extension
        ├── manifest.json       ← Update Client ID here
        ├── popup.html          ← UI (login + app)
        ├── popup.js            ← Main logic
        ├── background.js       ← Service worker
        ├── styles.css          ← Styling
        └── icons/              ← 3 PNG files (auto-generated)
```

**Removed:**
- `frontend/landing-page/` ❌ (entire website deleted)
- All onboarding code ❌
- All preferences routes ❌
- LLM chat assistant ❌

**Result:** Clean, simple extension! 🚀

