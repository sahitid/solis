# Testing Google Sign-In Buttons

## Current Status

The "Sign in with Google" and "Connect Google Account" buttons are already implemented and should work! Let's verify they're properly connected.

## How the OAuth Flow Works

### 1. User Clicks Button
```html
<button onclick="initiateGoogleLogin()">Sign in with Google</button>
```

### 2. JavaScript Function Runs
```javascript
async function initiateGoogleLogin() {
  // Get OAuth URL from backend
  const response = await fetch('http://localhost:5000/api/auth/url');
  const data = await response.json();
  
  // Redirect to Google's login page
  window.location.href = data.url;
}
```

### 3. Backend Generates OAuth URL
```javascript
router.get('/url', (req, res) => {
  const url = getAuthUrl(); // Generates Google OAuth URL
  res.json({ success: true, url });
});
```

### 4. User is Redirected to Google
- Google's login page opens
- User signs in with their Google account
- User authorizes Calendar & Gmail access

### 5. Google Redirects Back
- With authorization code
- Goes to: `http://localhost:8080/auth/callback.html`
- Callback page sends code to backend
- Backend exchanges code for tokens
- User is redirected to success page
- Success page saves user data
- Redirects to main app (logged in!)

## Quick Test

### Step 1: Make Sure Backend is Running
```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
✅ MongoDB Atlas connected successfully
```

### Step 2: Make Sure Landing Page is Running
```bash
cd frontend/landing-page
npx http-server -p 8080
```

You should see:
```
Starting up http-server, serving ./
Available on:
  http://localhost:8080
```

### Step 3: Test the Button

1. **Open your browser**
2. **Go to**: http://localhost:8080
3. **Click**: "Sign in with Google" button in header

**What Should Happen:**
- Browser redirects to Google's login page
- You see Google's OAuth consent screen
- After authorizing, you're redirected back (logged in!)

### Step 4: If It Doesn't Work

**Check these things:**

1. **Backend running?**
   ```bash
   # Should return: {"status":"Server is running",...}
   curl http://localhost:5000/api/health
   ```

2. **OAuth endpoint working?**
   ```bash
   # Should return: {"success":true,"url":"https://accounts.google.com/o/oauth2/..."}
   curl http://localhost:5000/api/auth/url
   ```

3. **Google Cloud Console configured?**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Check redirect URI includes: `http://localhost:8080/auth/callback.html`

4. **Environment variables set?**
   - Check `backend/.env` has:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback.html`

## Troubleshooting Common Issues

### Issue: "Cannot connect to backend"
**Symptom:** Button does nothing, console shows network error

**Solution:**
```bash
cd backend
npm run dev
# Make sure it starts successfully
```

### Issue: "redirect_uri_mismatch"
**Symptom:** Google shows error page after clicking button

**Solution:**
1. Go to Google Cloud Console
2. Add exact redirect URI: `http://localhost:8080/auth/callback.html`
3. Wait 5 minutes for changes to propagate
4. Try again

### Issue: "Invalid client"
**Symptom:** Google shows "invalid client" error

**Solution:**
- Verify `GOOGLE_CLIENT_ID` in `.env` is correct
- Verify `GOOGLE_CLIENT_SECRET` in `.env` is correct
- Make sure no extra spaces in `.env` file

### Issue: "Button appears but nothing happens"
**Symptom:** Click button, nothing happens

**Solution:**
1. Open browser console (F12)
2. Look for JavaScript errors
3. Check if `initiateGoogleLogin()` is defined
4. Verify `API_BASE` URL is correct

## Visual Test

Open the browser console and run:
```javascript
// This should show the OAuth URL
fetch('http://localhost:5000/api/auth/url')
  .then(r => r.json())
  .then(d => console.log('OAuth URL:', d.url))
```

If you see a long Google URL starting with `https://accounts.google.com/o/oauth2/...`, the backend is working!

## Manual OAuth Test URL

You can also test by visiting this URL directly (replace with your actual client ID):

```
https://accounts.google.com/o/oauth2/v2/auth?
  access_type=offline&
  scope=https://www.googleapis.com/auth/calendar%20https://www.googleapis.com/auth/calendar.events%20https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/userinfo.profile%20https://www.googleapis.com/auth/gmail.send&
  response_type=code&
  client_id=YOUR_CLIENT_ID_HERE&
  redirect_uri=http://localhost:8080/auth/callback.html&
  prompt=consent
```

Replace `YOUR_CLIENT_ID_HERE` with your actual Google Client ID from `.env`.

## Expected Flow

```
1. User on http://localhost:8080 (Landing Page)
   ↓ clicks "Sign in with Google"

2. JavaScript calls /api/auth/url
   ↓ Backend returns Google OAuth URL

3. Browser redirects to Google
   ↓ User signs in

4. Google redirects to http://localhost:8080/auth/callback.html
   ↓ With authorization code in URL

5. Callback page sends code to backend /api/auth/callback
   ↓ Backend exchanges code for tokens

6. Backend creates/updates user in MongoDB
   ↓ Returns user data

7. Callback redirects to success.html
   ↓ Shows celebration

8. Success page saves user to localStorage
   ↓ Redirects to main app

9. User is logged in! ✅
```

## Ready to Test!

Both backend and frontend should now be running in the background. 

**Open your browser and go to:**
```
http://localhost:8080
```

**Then click the "Sign in with Google" button!**

It should take you through the Google OAuth flow and log you in. 🚀

