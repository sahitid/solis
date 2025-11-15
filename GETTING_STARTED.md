# 🚀 Getting Started - See Solis in Action!

Based on your successful tests, everything is configured! Let's get it running.

---

## 🎯 Quick Start (5 minutes)

### Step 1: Start the Backend Server

```bash
cd backend
npm run dev
```

**What you should see:**
```
✅ MongoDB Atlas connected successfully
   Database: solis
Server running on port 5000
```

**Keep this terminal open!** The server needs to stay running.

---

### Step 2: Build the Frontend Chrome Extension

Open a **NEW terminal window** (keep the first one running):

```bash
cd frontend
npm install
npm run build
```

This creates a `frontend/build` folder with your Chrome extension.

---

### Step 3: Load Extension in Chrome

1. **Open Chrome** and go to:
   ```
   chrome://extensions/
   ```

2. **Enable "Developer mode"** (toggle in top-right corner)

3. **Click "Load unpacked"**

4. **Navigate to and select:** `frontend/build` folder

5. **You should see the Solis extension** appear with the sun icon ☀️

---

### Step 4: Pin the Extension (Optional but Recommended)

1. Click the **puzzle piece icon** in Chrome toolbar
2. Find **Solis**
3. Click the **pin icon** 📌
4. Now Solis appears in your toolbar!

---

## 🧪 Test Your Application

### Test 1: Open the Extension

1. **Click the Solis icon** in Chrome toolbar
2. You should see the welcome screen
3. Click **Settings** tab

### Test 2: Connect Google Calendar

1. In Settings, click **"Connect with Google"**
2. Select your Google account
3. **Grant permissions** (Calendar, Gmail)
4. You should see your profile in the header!

### Test 3: Create Your First Event

1. Go to **Home** tab
2. Type in the text box:
   ```
   Coffee with John tomorrow at 3pm for 1 hour
   ```
3. Click **"Parse Event"** 
4. Wait 2-3 seconds (AI is parsing!)
5. Review the parsed details
6. Click **"Add to Calendar"**
7. **Check your Google Calendar** - the event should appear!

### Test 4: Test Conflict Detection

1. Try creating another event at the same time:
   ```
   Team meeting tomorrow at 3pm
   ```
2. Click "Parse Event"
3. Click "Add to Calendar"
4. **You should see a conflict modal!** 🎉
5. Try the different resolution options

### Test 5: Test Rescheduling

1. In the conflict modal, click **"Reschedule Existing Event"**
2. See the available time slots with scores
3. Select a slot
4. Click "Confirm Reschedule"
5. **Check Google Calendar** - event should move!

---

## ✅ Success Checklist

When everything works, you should be able to:

- [x] Backend server running without errors
- [x] Chrome extension loaded and visible
- [x] Login with Google successfully
- [x] See your profile in the extension
- [x] Parse events from natural language
- [x] Create events in Google Calendar
- [x] Detect conflicts automatically
- [x] Reschedule events with AI suggestions
- [x] See changes reflected in Google Calendar

---

## 🎨 What You've Built

Congratulations! You have a fully functional:

1. **AI-Powered Event Parser**
   - Natural language → structured events
   - Gemini 2.5 Flash for intelligence

2. **Smart Conflict Detection**
   - Priority-based comparison
   - Flexibility rules
   - Multi-event cascade detection

3. **Intelligent Rescheduling**
   - Preference-aware slot finding
   - Solo event instant reschedule
   - Multi-attendee coordination with emails

4. **Google Calendar Integration**
   - Real-time sync
   - Create, update, delete events
   - OAuth authentication

5. **Beautiful Chrome Extension UI**
   - Notion-inspired design
   - Responsive and intuitive
   - Profile management

---

## 📱 Daily Usage

### Creating Events

Just type naturally:
- "Lunch with Sarah next Monday at noon"
- "Weekly standup every Tuesday at 10am"
- "Doctor appointment December 5th at 2:30pm"

### Managing Preferences

Go to Settings → Use AI Assistant:
- "I prefer morning meetings before 11am"
- "I need lunch break from 12-1pm every day"
- "No meetings after 5pm please"

---

## 🌐 Deployment Options

### Option 1: Keep It Local (Easiest)

What you have now works great for personal use:
- ✅ Free
- ✅ Full control
- ✅ Private data
- ✅ Perfect for 1-5 users

**To use daily:**
1. Start backend: `cd backend && npm run dev`
2. Extension auto-loads on Chrome startup
3. That's it!

---

### Option 2: Deploy Backend to Cloud (Recommended for Multi-User)

Deploy backend so multiple people can use it without running servers locally.

#### Deploy to Render.com (Free Tier)

**Step 1: Prepare for Deployment**

1. Create `backend/.gitignore` (already done)
2. Make sure `.env` is in `.gitignore` (already done)

**Step 2: Deploy to Render**

1. Go to https://render.com
2. Sign up/login with GitHub
3. Click **"New +" → "Web Service"**
4. Connect your GitHub repository
5. Configure:
   - **Name**: `solis-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add Environment Variables:
   - Copy all vars from your `.env` file
   - Add them one by one in Render dashboard
7. Click **"Create Web Service"**
8. Wait 5-10 minutes for deployment

**Step 3: Update Frontend**

Once deployed, update `frontend/src/config/api.ts`:
```typescript
export const API_BASE_URL = 'https://solis-backend.onrender.com/api';
```

Rebuild extension:
```bash
cd frontend
npm run build
```

Reload extension in Chrome.

---

#### Deploy to Railway (Alternative)

1. Go to https://railway.app
2. Connect GitHub repository
3. Select `backend` folder
4. Add environment variables
5. Deploy!

---

#### Deploy to Heroku

```bash
# Install Heroku CLI
# Login to Heroku

cd backend
git init
heroku create solis-backend
heroku config:set MONGO_URI=your_mongo_uri
heroku config:set GOOGLE_CLIENT_ID=your_client_id
# ... add all env vars
git add .
git commit -m "Deploy backend"
git push heroku main
```

---

### Option 3: Publish Chrome Extension (For Public Use)

**For Wide Distribution:**

1. **Prepare Extension**
   - Create proper icons (16x16, 48x48, 128x128)
   - Add privacy policy
   - Add detailed description
   - Test thoroughly

2. **Submit to Chrome Web Store**
   - Go to: https://chrome.google.com/webstore/devconsole
   - Pay $5 one-time registration fee
   - Upload `frontend/build` folder as ZIP
   - Fill in store listing
   - Submit for review (takes 1-3 days)

3. **Update OAuth for Production**
   - Add production redirect URIs
   - Move OAuth consent to "Production"
   - Apply for verification (if needed)

---

## 🔧 Maintenance & Updates

### Updating the Application

**Backend Changes:**
```bash
cd backend
# Make your changes
# If deployed, push to GitHub (Render/Railway auto-deploy)
```

**Frontend Changes:**
```bash
cd frontend
# Make your changes
npm run build
# Reload extension in chrome://extensions/
```

### Monitoring

**Backend Logs:**
- Render/Railway: View in dashboard
- Local: See terminal output

**Error Tracking:**
- Add Sentry for production error tracking
- Monitor MongoDB Atlas metrics
- Check Google Cloud API usage

---

## 💰 Cost Breakdown

### Current Setup (Development/Personal Use)

| Service | Cost | Usage |
|---------|------|-------|
| MongoDB Atlas | **FREE** | 512MB storage |
| Google Calendar API | **FREE** | 1M requests/day |
| Gmail API | **FREE** | 1B quota units/day |
| Gemini API | **FREE** | 1,500 requests/day |
| Chrome Extension | **FREE** | Unlimited |
| **Total** | **$0/month** | ✅ |

### Production Deployment (Optional)

| Service | Free Tier | Paid (if needed) |
|---------|-----------|------------------|
| Render/Railway Backend | **FREE** | $7/month |
| MongoDB Atlas | **FREE** | $9/month (if scaling) |
| Chrome Web Store | **$5 once** | One-time fee |
| Domain (optional) | - | $12/year |

**Most users: Still FREE with free tiers!**

---

## 🎓 Advanced Features (Future Enhancements)

Ideas for extending Solis:

1. **Multi-Calendar Support**
   - Sync multiple Google Calendars
   - Work vs Personal separation

2. **Team Features**
   - Shared calendars
   - Team scheduling
   - Meeting polls

3. **Smart Suggestions**
   - "When should I schedule X?"
   - Automatic event clustering
   - Focus time protection

4. **Integrations**
   - Slack notifications
   - Zoom meeting creation
   - Email parsing (create events from emails)

5. **Analytics**
   - Time tracking
   - Meeting analysis
   - Productivity insights

---

## 🆘 Troubleshooting

### Extension Not Loading

1. Check `frontend/build` folder exists
2. Try "Remove" then "Load unpacked" again
3. Check for errors in console (F12)

### Backend Connection Issues

1. Verify server is running: `curl http://localhost:5000/api/health`
2. Check firewall isn't blocking port 5000
3. Ensure `CLIENT_URL` in `.env` matches

### OAuth Not Working

1. Verify redirect URI: `http://localhost:5000/api/auth/callback`
2. Add your email as test user in Google Cloud Console
3. Clear Chrome cookies and try again

### Events Not Syncing

1. Check Google Calendar API is enabled
2. Verify API key in `.env`
3. Check server logs for errors
4. Ensure OAuth tokens are valid

---

## 📚 Documentation Reference

- **Backend API**: See `README.md` for all endpoints
- **Frontend Components**: See `FRONTEND_COMPLETE.md`
- **Testing**: See `TEST_RESULTS_SUMMARY.md`
- **OAuth Setup**: See `GOOGLE_OAUTH_SETUP.md`
- **Gemini Setup**: See `GEMINI_MIGRATION.md`

---

## 🎉 You're Done!

You've successfully built a production-ready AI-powered calendar assistant!

### What You Accomplished:

✅ Full-stack application (Backend + Frontend)  
✅ AI integration (Gemini 2.5)  
✅ Google Cloud APIs (Calendar, Gmail, OAuth)  
✅ MongoDB database  
✅ Chrome extension  
✅ Smart scheduling algorithms  
✅ Conflict detection and resolution  
✅ Multi-attendee coordination  
✅ Beautiful Notion-inspired UI  

### Next Steps:

1. **Use it daily** - The best way to find improvements
2. **Share with friends** - Get feedback
3. **Add features** - Build what you need
4. **Deploy to cloud** - When ready for others

---

## 🌟 Share Your Success

Built something cool with this? Share it!
- Tag us on social media
- Write a blog post about your experience
- Help others by contributing improvements

---

**Congratulations on building Solis! 🎊**

You now have a powerful AI assistant for your calendar. Enjoy! ☀️

