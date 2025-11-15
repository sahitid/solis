# Google OAuth - Quick Start Checklist

Follow these steps in order. Check off each one as you complete it!

---

## 📝 Before You Start

Open these links in browser tabs (you'll need them):

1. **Google Cloud Console**: https://console.cloud.google.com
2. **Your .env file**: Open `backend/.env` in VS Code

---

## ✅ Step-by-Step Checklist

### 🏗️ Part 1: Setup Project & Enable APIs (5 minutes)

- [ ] **1.1** Go to https://console.cloud.google.com
- [ ] **1.2** Select the same project you used for Gemini API
- [ ] **1.3** Enable Google Calendar API
  - Link: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
  - Click "ENABLE"
- [ ] **1.4** Enable Gmail API
  - Link: https://console.cloud.google.com/apis/library/gmail.googleapis.com
  - Click "ENABLE"
- [ ] **1.5** Enable Google+ API
  - Link: https://console.cloud.google.com/apis/library/plus.googleapis.com
  - Click "ENABLE"

---

### 🔐 Part 2: Configure OAuth Consent Screen (3 minutes)

- [ ] **2.1** Go to: https://console.cloud.google.com/apis/credentials/consent
- [ ] **2.2** Choose "External" user type
- [ ] **2.3** Fill in required fields:
  - App name: `Solis`
  - Your email for support
  - Your email for developer contact
- [ ] **2.4** Click "SAVE AND CONTINUE"
- [ ] **2.5** Add Scopes - click "ADD OR REMOVE SCOPES", select:
  - ✅ `.../auth/userinfo.email`
  - ✅ `.../auth/userinfo.profile`
  - ✅ `.../auth/calendar`
  - ✅ `.../auth/calendar.events`
  - ✅ `.../auth/gmail.send`
- [ ] **2.6** Click "UPDATE" then "SAVE AND CONTINUE"
- [ ] **2.7** Add Test Users - add your email address
- [ ] **2.8** Click "SAVE AND CONTINUE" then "BACK TO DASHBOARD"

---

### 🔑 Part 3: Create Credentials (2 minutes)

- [ ] **3.1** Go to: https://console.cloud.google.com/apis/credentials
- [ ] **3.2** Click "+ CREATE CREDENTIALS" → "OAuth client ID"
- [ ] **3.3** Application type: "Web application"
- [ ] **3.4** Name: `Solis Backend`
- [ ] **3.5** Authorized redirect URIs - add these two:
  - `http://localhost:5000/api/auth/callback`
  - `http://localhost:3000`
- [ ] **3.6** Click "CREATE"
- [ ] **3.7** **COPY** the Client ID (looks like: `123...apps.googleusercontent.com`)
- [ ] **3.8** **COPY** the Client Secret (looks like: `GOCSPX-...`)
- [ ] **3.9** Go back to credentials page
- [ ] **3.10** Click "+ CREATE CREDENTIALS" → "API key"
- [ ] **3.11** **COPY** the API key (looks like: `AIzaSy...`)

---

### 📝 Part 4: Update .env File (1 minute)

- [ ] **4.1** Open `backend/.env` in VS Code
- [ ] **4.2** Find `GOOGLE_CLIENT_ID=` and paste your Client ID
- [ ] **4.3** Find `GOOGLE_CLIENT_SECRET=` and paste your Client Secret  
- [ ] **4.4** Find `GOOGLE_API_KEY=` and paste your API Key
- [ ] **4.5** Save the file (Ctrl+S)

---

### 🧪 Part 5: Test Everything (2 minutes)

- [ ] **5.1** Run configuration test:
  ```bash
  cd backend
  node test-oauth.js
  ```
- [ ] **5.2** Verify all credentials show ✅
- [ ] **5.3** Start the server:
  ```bash
  npm run dev
  ```
- [ ] **5.4** Test OAuth flow - open in browser:
  ```
  http://localhost:5000/api/auth/google
  ```
- [ ] **5.5** You should see Google's login page
- [ ] **5.6** Log in and grant permissions
- [ ] **5.7** Should redirect back with success message

---

## 🎉 Success Indicators

When everything works, you'll see:

✅ `node test-oauth.js` shows all credentials configured  
✅ Server starts without errors  
✅ Can access OAuth login page  
✅ Google asks for permissions  
✅ Redirects back to app successfully  

---

## 🆘 Quick Troubleshooting

**All credentials show ❌:**
- You need to complete Parts 1-4 first

**"redirect_uri_mismatch" error:**
- Check Step 3.5 - make sure both URIs are added exactly

**"invalid_client" error:**
- Check Step 4 - make sure you copied credentials correctly
- No extra spaces in .env file

**"access_denied" error:**
- Check Step 2.7 - add your email as a test user

**"This app isn't verified" warning:**
- This is normal! Click "Advanced" → "Go to Solis (unsafe)"
- It's safe because it's your own app

---

## ⏱️ Total Time: ~15 minutes

Once complete, you'll have:
- ✅ OAuth authentication working
- ✅ Access to Google Calendar
- ✅ Access to Gmail
- ✅ Ready for frontend testing

---

## 📚 Need More Details?

See **GOOGLE_OAUTH_SETUP.md** for:
- Detailed explanations
- Screenshots
- Advanced configuration
- Production deployment tips

