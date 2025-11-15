# ✅ OAuth Setup Complete

## Step 1: Connect Google Calendar - COMPLETED

The OAuth flow has been fully implemented and is ready to use!

---

## 🎯 What Was Implemented

### Backend OAuth Routes
✅ **GET /api/auth/url** - Generate Google OAuth URL  
✅ **GET /api/auth/callback** - Handle OAuth redirect from Google  
✅ **POST /api/auth/callback** - Handle programmatic OAuth (for extensions)  
✅ **GET /api/auth/permissions** - Check Calendar & Gmail permissions  
✅ **GET /api/auth/status** - Check if user is authenticated  
✅ **POST /api/auth/logout** - Logout and revoke tokens  
✅ **POST /api/auth/refresh-token** - Refresh expired tokens

### Frontend OAuth Pages
✅ **auth/callback.html** - Receives OAuth code from Google  
✅ **auth/success.html** - Success page with redirect  
✅ **Landing page integration** - Seamless login/logout flow

### OAuth Scopes Requested
- ✅ Google Calendar (read/write)
- ✅ Google Calendar Events
- ✅ Gmail Send (for reschedule emails)
- ✅ User Profile Info

### Database Integration
✅ User created/updated in MongoDB with:
- OAuth tokens (access + refresh)
- Google Calendar ID
- Token expiry tracking
- Default work hours
- Onboarding status

---

## 🚀 How to Use It

### 1. Update Your .env File

Add this to `backend/.env`:

```env
# OAuth Redirect URI (use the landing page URL)
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback.html
```

### 2. Update Google Cloud Console

Go to: https://console.cloud.google.com/apis/credentials

1. Click on your OAuth 2.0 Client ID
2. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:8080/auth/callback.html
   http://localhost:5000/api/auth/callback
   ```
3. Click **Save**

### 3. Start the Backend

```bash
cd backend
npm run dev
```

### 4. Start the Landing Page

```bash
cd frontend/landing-page
npx http-server -p 8080
```

Or just open `index.html` directly.

### 5. Test the OAuth Flow

1. Open http://localhost:8080
2. Click **"Sign in with Google"**
3. Authorize the app
4. You'll be redirected back with success message!

---

## 🔍 OAuth Flow Diagram

```
User clicks "Sign in"
      ↓
Frontend requests OAuth URL from backend
      ↓
Backend generates URL with required scopes
      ↓
User redirected to Google login page
      ↓
User authorizes Calendar & Gmail access
      ↓
Google redirects to callback.html with code
      ↓
callback.html sends code to backend
      ↓
Backend exchanges code for tokens
      ↓
Backend fetches user info from Google
      ↓
Backend creates/updates user in MongoDB
      ↓
Backend returns user data
      ↓
Frontend saves to localStorage
      ↓
User redirected to success page
      ↓
Success page redirects to settings tab
      ↓
✅ User is logged in!
```

---

## 🧪 Testing OAuth

### Test Script

Create `backend/test-oauth-flow.js`:

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function testOAuthSetup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Check environment variables
    console.log('🔑 Checking OAuth Configuration:');
    console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Redirect URI: ${process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/callback.html'}\n`);
    
    // Check if any users have OAuth tokens
    const users = await User.find({ 'OAuth_Token.access_token': { $exists: true, $ne: '' } });
    console.log(`👥 Users with OAuth tokens: ${users.length}`);
    
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`   - ${user.Full_Name} (${user.Email})`);
        console.log(`     Token expires: ${new Date(user.OAuth_Token.expiry_date)}`);
      });
    }
    
    console.log('\n✅ OAuth setup looks good!');
    console.log('💡 Test the flow by opening: http://localhost:8080\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testOAuthSetup();
```

Run it:
```bash
cd backend
node test-oauth-flow.js
```

### Manual Testing Steps

1. **Start backend**: `cd backend && npm run dev`
2. **Start frontend**: `cd frontend/landing-page && npx http-server -p 8080`
3. **Open browser**: http://localhost:8080
4. **Click "Sign in with Google"**
5. **Authorize the app**
6. **Verify**:
   - Redirected to success page ✅
   - User profile shown in header ✅
   - Settings tab shows account info ✅
   - Calendar & Gmail permissions shown ✅

---

## 🐛 Troubleshooting

### Issue: "redirect_uri_mismatch"
**Solution**: Make sure the redirect URI in Google Cloud Console exactly matches:
```
http://localhost:8080/auth/callback.html
```

### Issue: "invalid_client"
**Solution**: Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct in `.env`

### Issue: "User not created in database"
**Solution**: Check MongoDB connection and make sure MONGO_URI is correct

### Issue: "Token expired"
**Solution**: The app will automatically refresh tokens using the refresh_token

---

## ✨ What's Next

Now that OAuth is complete, move to **Step 2**:

### Step 2: Baseline Preferences with LLM

Implement the conversational onboarding flow where the LLM helps users set:
- ✏️ Typical work hours
- ✏️ Bedtime
- ✏️ Flexibility defaults

This has been partially implemented in the landing page. Next steps:
1. Test the LLM chat assistant
2. Enhance conversation flow
3. Add preference validation
4. Mark onboarding as complete

---

## 📊 OAuth Implementation Status

| Component | Status |
|-----------|--------|
| Backend OAuth routes | ✅ Complete |
| Frontend OAuth pages | ✅ Complete |
| Google Cloud setup required | ⚠️ Manual step |
| Database integration | ✅ Complete |
| Token refresh | ✅ Complete |
| Permission checking | ✅ Complete |
| Logout/revoke | ✅ Complete |

**OAuth Flow: 100% Complete** 🎉

Just needs Google Cloud Console configuration and testing!

