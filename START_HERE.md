# 🚀 START HERE - Final 3 Steps to Get Solis Working

## ✅ What's Already Done

- ✅ Backend is running on http://localhost:5000
- ✅ MongoDB is connected
- ✅ Web-based OAuth implemented
- ✅ Extension files created
- ✅ All code ready to go

---

## 📝 You Need to Do 3 Simple Things

### Step 1: Load Extension & Get Extension ID (2 minutes)

1. Open Chrome and go to: **`chrome://extensions/`**

2. Enable **"Developer mode"** (toggle in top-right)

3. Click **"Load unpacked"**

4. Navigate to and select this folder:
   ```
   C:\Users\sdasa\OneDrive\Documents\GitHub\solis\frontend\extension
   ```

5. Click **"Select Folder"**

6. You'll see "Solis - Smart Calendar" appear

7. **Look under the extension name** - you'll see **"ID: abcd..."**

8. **COPY THIS ENTIRE ID** (it's a long random string)

---

### Step 2: Configure Backend with Extension ID (1 minute)

1. Open: `backend/.env`

2. Add this line (replace with YOUR actual Extension ID from Step 1):
   ```env
   EXTENSION_ID=paste_your_extension_id_here
   ```

3. Also add/update:
   ```env
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
   ```

4. **Save the file**

---

### Step 3: Update Google OAuth Settings (2 minutes)

1. Go to: https://console.cloud.google.com/

2. Select your project

3. Go to: **APIs & Services > Credentials**

4. Click your **OAuth 2.0 Client ID**

5. In **"Authorized redirect URIs"**, add BOTH of these:
   ```
   http://localhost:5000/api/auth/callback
   ```
   ```
   chrome-extension://YOUR_EXTENSION_ID_FROM_STEP_1/callback.html
   ```
   
   **Example (use your actual ID):**
   ```
   chrome-extension://abcdefghijklmnop/callback.html
   ```

6. Click **Save**

---

## 🧪 Test It Now!

1. **Restart backend** (if it's not already running):
   ```bash
   cd backend
   npm run dev
   ```

2. **Click the Solis icon** in Chrome toolbar (you may need to pin it first)

3. Click **"Sign in with Google"**

4. **A new tab will open** with Google sign-in

5. Sign in with your Google account

6. Grant permissions for Calendar access

7. Tab will show **"Sign in successful!"** and auto-close

8. **Go back to the extension popup**

9. **You should be logged in!** ✅

---

## 🎯 What You Should See

**After signing in:**
- Your name and email in the extension
- Event creation form
- Can add events to your calendar

**In MongoDB:**
- New user document with:
  - Full_Name
  - Email
  - OAuth_Token
  - GCal_ID
  - Events: []

---

## 🐛 If Something Goes Wrong

### "redirect_uri_mismatch" error

**Problem:** Google OAuth redirect URIs don't match

**Fix:**
1. Double-check both URIs are added to Google Console
2. Make sure Extension ID is correct (no typos)
3. Save changes in Google Console
4. Try again

### Backend error or callback fails

**Problem:** Extension ID not configured

**Fix:**
1. Check `backend/.env` has `EXTENSION_ID=...`
2. Restart backend: `npm run dev`
3. Try signing in again

### Extension won't load

**Problem:** Missing files or syntax error

**Fix:**
1. Go to `chrome://extensions/`
2. Look for red "Errors" badge on Solis
3. Click "Errors" to see details
4. Let me know what it says!

---

## 📸 Visual Guide

### Step 1: Finding Extension ID
```
chrome://extensions/
└── Solis - Smart Calendar
    ├── Version: 1.0.0
    └── ID: abcdefgh... ← COPY THIS
```

### Step 2: .env File
```env
# Add this line:
EXTENSION_ID=abcdefgh...

# And this:
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
```

### Step 3: Google Console Redirect URIs
```
Authorized redirect URIs:
  [+] http://localhost:5000/api/auth/callback
  [+] chrome-extension://abcdefgh.../callback.html
```

---

## ✨ That's It!

Once you complete these 3 steps:
- Extension OAuth will work
- You can sign in with Google
- You can create calendar events
- Everything will be saved to MongoDB

**Total time: ~5 minutes**

---

## 📚 More Help

- **Detailed guide:** See [WEB_OAUTH_COMPLETE.md](WEB_OAUTH_COMPLETE.md)
- **Extension ID setup:** See [EXTENSION_ID_SETUP.md](EXTENSION_ID_SETUP.md)
- **Troubleshooting:** See [CHROME_EXTENSION_OAUTH_FIX.md](CHROME_EXTENSION_OAUTH_FIX.md)

---

**Let me know when you complete these steps and I'll help you test! 🚀**

