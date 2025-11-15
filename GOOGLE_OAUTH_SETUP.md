# Google OAuth Setup Guide

Complete guide to set up Google OAuth for Solis authentication and API access.

---

## 🎯 What You'll Get

After this setup:
- ✅ Users can log in with Google
- ✅ Access to Google Calendar
- ✅ Access to Gmail (for sending reschedule emails)
- ✅ User profile information

---

## 📋 Step-by-Step Setup

### Step 1: Go to Google Cloud Console

Open this link:
```
https://console.cloud.google.com
```

Sign in with your Google account.

---

### Step 2: Create or Select a Project

**Option A: Use the same project as your Gemini API key** (Recommended)
- At the top of the page, click the project dropdown
- Select the project you created for Gemini
- This keeps everything organized in one place!

**Option B: Create a new project**
- Click "Select a project" → "New Project"
- Name it: `Solis Backend`
- Click "Create"
- Wait a few seconds for it to be created

---

### Step 3: Enable Required APIs

You need to enable 3 APIs. For each one:

#### 3a. Enable Google Calendar API

1. Go to: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
2. Make sure your project is selected at the top
3. Click the blue "**ENABLE**" button
4. Wait for confirmation

#### 3b. Enable Gmail API

1. Go to: https://console.cloud.google.com/apis/library/gmail.googleapis.com
2. Click the blue "**ENABLE**" button
3. Wait for confirmation

#### 3c. Enable Google+ API (for user profile)

1. Go to: https://console.cloud.google.com/apis/library/plus.googleapis.com
2. Click the blue "**ENABLE**" button
3. Wait for confirmation

---

### Step 4: Configure OAuth Consent Screen

1. Go to: https://console.cloud.google.com/apis/credentials/consent

2. **Choose User Type:**
   - Select "**External**" (allows any Google user to log in)
   - Click "**CREATE**"

3. **Fill in App Information:**
   
   **Required fields:**
   - App name: `Solis`
   - User support email: (your email)
   - Developer contact: (your email)
   
   **Optional fields:** (you can leave blank for now)
   - App logo
   - App domain
   - Privacy policy
   - Terms of service

4. Click "**SAVE AND CONTINUE**"

5. **Add Scopes:**
   - Click "**ADD OR REMOVE SCOPES**"
   - Find and select these scopes:
     * `.../auth/userinfo.email`
     * `.../auth/userinfo.profile`
     * `.../auth/calendar`
     * `.../auth/calendar.events`
     * `.../auth/gmail.send`
   - Click "**UPDATE**"
   - Click "**SAVE AND CONTINUE**"

6. **Add Test Users (Important!):**
   - Click "**ADD USERS**"
   - Enter your email address (the one you'll use to test)
   - Click "**ADD**"
   - Click "**SAVE AND CONTINUE**"

7. **Summary:**
   - Review and click "**BACK TO DASHBOARD**"

---

### Step 5: Create OAuth Client ID

1. Go to: https://console.cloud.google.com/apis/credentials

2. Click "**+ CREATE CREDENTIALS**" at the top

3. Select "**OAuth client ID**"

4. **Application type:** Choose "**Web application**"

5. **Name:** `Solis Backend`

6. **Authorized redirect URIs:**
   - Click "**+ ADD URI**"
   - Enter: `http://localhost:5000/api/auth/callback`
   - Click "**+ ADD URI**" again
   - Enter: `http://localhost:3000` (for frontend)
   
7. Click "**CREATE**"

8. **IMPORTANT:** A popup will appear with your credentials:
   - **Client ID**: Something like `123456789-abc123.apps.googleusercontent.com`
   - **Client Secret**: Something like `GOCSPX-abc123xyz789`
   
   **Copy both of these!** Keep them handy.

---

### Step 6: Update Your .env File

1. Open `backend/.env` in VS Code

2. Find these lines and replace with your actual credentials:

```env
# Google OAuth (FROM STEP 5)
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
```

3. Save the file (Ctrl+S)

---

### Step 7: Create a Google API Key

You need a separate API key for direct Calendar/Gmail operations:

1. Go to: https://console.cloud.google.com/apis/credentials

2. Click "**+ CREATE CREDENTIALS**"

3. Select "**API key**"

4. Copy the API key that appears

5. (Optional) Click "**RESTRICT KEY**" to secure it:
   - Under "API restrictions": Select "Restrict key"
   - Check: Google Calendar API, Gmail API
   - Click "**SAVE**"

6. Update your `.env`:

```env
# Google API Key (FROM STEP 7)
GOOGLE_API_KEY=AIzaSyD-your_api_key_here
```

---

## ✅ Final .env File Check

Your `backend/.env` should now have all these filled in:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB Atlas
MONGO_URI=mongodb+srv://your_connection_string

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback

# Google API Key
GOOGLE_API_KEY=AIzaSyD-your_api_key_here

# Google Calendar ID
GOOGLE_CALENDAR_ID=primary

# Google Gemini API
GEMINI_API_KEY=AIzaSyD-your_gemini_key_here

# Optional
ENABLE_PERIODIC_SYNC=true
SYNC_INTERVAL_MINUTES=15
```

---

## 🧪 Test Your Setup

### Test 1: Start the Server

```bash
cd backend
npm run dev
```

Should show:
```
✅ MongoDB Atlas connected successfully
Server running on port 5000
```

### Test 2: Test OAuth Flow

Open your browser and go to:
```
http://localhost:5000/api/auth/google
```

You should:
1. See Google's login page
2. Be asked to select your Google account
3. See permission request for Calendar and Gmail access
4. Get redirected back to your app

If you see: `"Authentication successful"` - It works! ✅

---

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause:** The redirect URI doesn't match

**Fix:**
1. Go back to Google Cloud Console → Credentials
2. Click on your OAuth Client ID
3. Under "Authorized redirect URIs", make sure you have:
   - `http://localhost:5000/api/auth/callback`
4. Save and wait 1 minute for changes to propagate

### Error: "invalid_client"

**Cause:** Wrong Client ID or Secret

**Fix:**
1. Double-check the values in your `.env` file
2. Make sure there are no extra spaces
3. Verify you copied the entire strings

### Error: "access_denied"

**Cause:** You're not added as a test user

**Fix:**
1. Go to OAuth Consent Screen
2. Add your email under "Test users"
3. Try logging in again

### Error: "App not verified"

**Don't worry!** During development, you'll see a warning screen:
- Click "Advanced"
- Click "Go to Solis (unsafe)"
- This is normal for apps in testing mode

---

## 📊 Verification Checklist

After setup, verify:

- [ ] OAuth Consent Screen configured
- [ ] Test user (your email) added
- [ ] Google Calendar API enabled
- [ ] Gmail API enabled  
- [ ] Google+ API enabled
- [ ] OAuth Client ID created
- [ ] API Key created
- [ ] All credentials in `.env` file
- [ ] Server starts without errors
- [ ] Can access http://localhost:5000/api/auth/google

---

## 🎯 What's Next

Once OAuth is working:

1. **Test Event Creation:**
   - Parse an event with AI
   - Save to Google Calendar

2. **Test Conflict Detection:**
   - Create overlapping events
   - See conflict resolution

3. **Build Frontend:**
   - Load Chrome extension
   - Complete end-to-end flow

---

## 💡 Tips

**For Development:**
- Keep app in "Testing" mode (not "Production")
- Add all developers as test users
- Use "External" user type for flexibility

**For Production:**
- Apply for app verification
- Add privacy policy
- Move to "Production" mode
- Add proper app logo and branding

---

## 🆘 Need Help?

Common links:
- OAuth Consent: https://console.cloud.google.com/apis/credentials/consent
- Credentials: https://console.cloud.google.com/apis/credentials
- Enabled APIs: https://console.cloud.google.com/apis/dashboard

If stuck, check the error message carefully - Google usually provides helpful hints!

