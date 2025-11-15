# Integration & Testing Guide

This guide will help you integrate and test the complete Solis application (backend + frontend).

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js v16+ installed
- [ ] MongoDB running (local or cloud)
- [ ] Google Cloud Project created
- [ ] Google Calendar API enabled
- [ ] Gmail API enabled
- [ ] Google OAuth 2.0 credentials created
- [ ] Google Gemini API key
- [ ] Chrome browser installed

## Step 1: Google Cloud Configuration

### 1.1 Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project or create a new one
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   ```
   http://localhost:5000/api/auth/callback
   http://localhost:3000
   ```
7. Note down:
   - Client ID
   - Client Secret

### 1.2 Enable Required APIs

Enable these APIs in your Google Cloud project:
- Google Calendar API
- Gmail API
- Google+ API (for profile information)

### 1.3 Configure OAuth Consent Screen

1. Navigate to "OAuth consent screen"
2. Choose "External" user type
3. Fill in application information:
   - App name: Solis
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `.../auth/calendar`
   - `.../auth/calendar.events`
   - `.../auth/gmail.send`
   - `.../auth/userinfo.profile`
   - `.../auth/userinfo.email`
5. Add test users (your email addresses)

## Step 2: Backend Configuration

### 2.1 Create Environment File

In `backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/solis
# Or MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/solis

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Optional Features
ENABLE_PERIODIC_SYNC=true
SYNC_INTERVAL_MINUTES=15
```

### 2.2 Install and Start Backend

```bash
cd backend
npm install
npm run dev
```

You should see:
```
Server running on port 5000
MongoDB connected successfully
```

### 2.3 Verify Backend Health

Test the health endpoint:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "Server is running",
  "timestamp": "2025-11-15T..."
}
```

## Step 3: Frontend Configuration

### 3.1 Update API Configuration

Edit `frontend/src/config/api.ts`:

```typescript
export const API_BASE_URL = 'http://localhost:5000/api';
```

### 3.2 Update Manifest for Development

Edit `frontend/manifest.json` to add your OAuth client ID:

```json
{
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  }
}
```

### 3.3 Install and Build Frontend

```bash
cd frontend
npm install
npm run build
```

### 3.4 Load Extension in Chrome

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `frontend/build` directory
5. Note the Extension ID (you'll need this)

### 3.5 Update Google Cloud Redirect URIs

Add the Chrome extension redirect URI:
```
https://<extension-id>.chromiumapp.org/
```

Replace `<extension-id>` with your actual extension ID from Chrome.

## Step 4: Integration Testing

### 4.1 Test Authentication Flow

1. Click the Solis extension icon in Chrome
2. Navigate to "Settings" tab
3. Click "Connect with Google"
4. Complete OAuth authorization
5. Verify you see:
   - Your name and email in the header
   - "Connected to Google Calendar" badge
   - Settings form populated

### 4.2 Test Event Creation

1. Navigate to "Home" tab
2. Enter: "Coffee with John tomorrow at 3pm for 1 hour"
3. Click "Parse Event"
4. Verify the event details are parsed correctly
5. Edit any fields if needed
6. Click "Add to Calendar"
7. Check Google Calendar to confirm event was created

### 4.3 Test Conflict Detection

1. Create an event at 2pm tomorrow
2. Try to create another event at 2:30pm tomorrow
3. Verify conflict modal appears
4. Check that:
   - Both events are displayed
   - Conflict reason is shown
   - Recommendations are provided
5. Try different resolution options

### 4.4 Test Solo Rescheduling

1. Create a solo event (no attendees)
2. Create a conflicting event
3. In conflict modal, click "Reschedule Existing Event"
4. Verify time slots appear with scores
5. Select a slot
6. Click "Confirm Reschedule"
7. Check Google Calendar for updated time

### 4.5 Test Multi-Attendee Rescheduling

1. Create an event with attendees (add email addresses)
2. Create a conflict
3. Click "Reschedule Existing Event"
4. Verify:
   - Attendees are listed
   - Time slots are shown
5. Select a slot and click "Send Proposal"
6. Check Gmail for sent email
7. Verify proposal status tracking

### 4.6 Test Preferences

1. Navigate to Settings
2. Click "AI Setup Assistant"
3. Enter: "I prefer morning meetings, need lunch at noon, end work at 5pm"
4. Click "Analyze with AI"
5. Verify preferences are populated:
   - Working hours: 9am-5pm
   - Preferred meeting times: Morning
   - Break time: 12pm-1pm
6. Manually adjust any preferences
7. Click "Save Preferences"
8. Refresh extension and verify preferences persist

## Step 5: Common Issues & Solutions

### Backend Issues

**MongoDB Connection Failed**
```
Error: MongoDB connection error
```
Solution:
- Ensure MongoDB is running: `mongod`
- Check MONGO_URI in .env is correct
- For Atlas, verify network access and credentials

**Google Auth Error**
```
Error: invalid_client
```
Solution:
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Check redirect URI matches Google Cloud Console
- Ensure OAuth consent screen is configured

**Gemini API Error**
```
Error: 401 Unauthorized
```
Solution:
- Verify GEMINI_API_KEY is correct
- Ensure API is enabled in Google Cloud Console
- Check you haven't exceeded quota limits

### Frontend Issues

**Extension Not Loading**
```
Manifest file is invalid
```
Solution:
- Check manifest.json syntax
- Ensure all file paths exist
- Verify permissions are correct

**OAuth Flow Fails**
```
Error: redirect_uri_mismatch
```
Solution:
- Add extension redirect URI to Google Cloud Console
- Format: `https://<extension-id>.chromiumapp.org/`
- Wait a few minutes for changes to propagate

**API Connection Failed**
```
Network Error
```
Solution:
- Ensure backend is running on port 5000
- Check API_BASE_URL in frontend/src/config/api.ts
- Verify CORS is enabled in backend

**Events Not Appearing**
```
No events returned
```
Solution:
- Check browser console for errors
- Verify authentication tokens are valid
- Test backend endpoints directly with curl

## Step 6: Testing Checklist

Use this checklist to verify all features work:

### Authentication
- [ ] Google OAuth login works
- [ ] User profile displays correctly
- [ ] Logout works
- [ ] Session persists after closing extension

### Event Management
- [ ] Natural language parsing works
- [ ] Event metadata can be edited
- [ ] Events are created in Google Calendar
- [ ] Events can be viewed
- [ ] Events can be updated
- [ ] Events can be deleted

### Conflict Detection
- [ ] Time overlap conflicts detected
- [ ] Priority comparison works correctly
- [ ] Flexibility rules applied
- [ ] Recommendations are sensible
- [ ] Multiple conflicts shown
- [ ] Cascade conflicts detected

### Rescheduling (Solo)
- [ ] Same-day slots found
- [ ] Alternative days shown
- [ ] Scores calculated correctly
- [ ] Slot selection works
- [ ] Event successfully rescheduled
- [ ] Google Calendar updated

### Rescheduling (Multi-Attendee)
- [ ] Attendees listed correctly
- [ ] Proposal email sent
- [ ] Voting links work
- [ ] Status updates in real-time
- [ ] Majority vote calculated
- [ ] Auto-finalization works

### Preferences
- [ ] LLM parsing of preferences
- [ ] Manual preference editing
- [ ] Preferences saved
- [ ] Preferences persist
- [ ] Working hours respected
- [ ] Break times blocked
- [ ] Buffer times applied

## Step 7: Production Deployment

### Backend Deployment (Example: Heroku)

1. Create Heroku app:
```bash
heroku create solis-backend
```

2. Set environment variables:
```bash
heroku config:set MONGO_URI=your_mongodb_atlas_uri
heroku config:set GOOGLE_CLIENT_ID=your_client_id
heroku config:set GOOGLE_CLIENT_SECRET=your_secret
heroku config:set ANTHROPIC_API_KEY=your_key
heroku config:set CLIENT_URL=https://your-frontend-url
```

3. Deploy:
```bash
git push heroku main
```

### Frontend Deployment (Chrome Web Store)

1. Update `manifest.json` with production values
2. Build production version:
```bash
npm run build
```
3. Create ZIP file of build folder
4. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
5. Fill in store listing details
6. Submit for review

### Update Google Cloud for Production

1. Add production redirect URIs:
   - Backend: `https://your-backend-url.com/api/auth/callback`
   - Frontend: `https://your-frontend-url.com`
   - Extension: `https://<production-extension-id>.chromiumapp.org/`

2. Update OAuth consent screen with production URLs

3. Move from "Testing" to "In Production" status

## Step 8: Monitoring & Maintenance

### Backend Monitoring

- Monitor MongoDB connection status
- Track API response times
- Log authentication failures
- Monitor LLM API usage and costs
- Track periodic sync job execution

### Frontend Monitoring

- Monitor extension error logs
- Track user authentication issues
- Check API call failures
- Monitor Chrome extension reviews

### Regular Maintenance

- Update dependencies monthly
- Review and rotate API keys quarterly
- Monitor quota limits for Google APIs
- Check for breaking changes in dependencies
- Update OAuth scopes if needed

## Need Help?

If you encounter issues:

1. Check backend logs: `npm run dev` output
2. Check browser console: F12 → Console tab
3. Check network requests: F12 → Network tab
4. Review error messages carefully
5. Test backend endpoints directly with curl
6. Verify environment variables are correct

## Success Criteria

Your integration is successful when:

✅ Extension loads without errors  
✅ OAuth authentication completes  
✅ Events can be created via natural language  
✅ Conflicts are detected and shown  
✅ Solo rescheduling finds and applies slots  
✅ Multi-attendee proposals send emails  
✅ Preferences can be saved and applied  
✅ Google Calendar stays in sync  
✅ All UI components render correctly  
✅ No console errors during normal operation  

Congratulations! Solis is now fully integrated and ready to use! 🎉

