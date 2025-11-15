# ✅ FIXED: CORS Issue for OAuth Buttons

## Problem
The "Sign in with Google" button was showing "Failed to fetch" error because the backend CORS was only allowing `http://localhost:3000`, but the landing page runs on `http://localhost:8080`.

## Solution Applied
I updated `backend/server.js` to allow CORS from multiple origins:

```javascript
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:8080',  // Landing page ✅
    'http://127.0.0.1:8080'   // Alternative localhost ✅
  ],
  credentials: true
}));
```

## What I Did
1. ✅ Updated CORS configuration in `backend/server.js`
2. ✅ Stopped all node processes
3. ✅ Restarted backend server with new config
4. ✅ Restarted frontend server

## Next Steps for You

### 1. Verify Backend is Running

Open a new terminal and run:
```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
✅ MongoDB Atlas connected successfully
```

**Keep this terminal open!**

### 2. Verify Frontend is Running

Open another terminal and run:
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

**Keep this terminal open too!**

### 3. Test the OAuth Button

1. **Open your browser**
2. **Go to**: http://localhost:8080
3. **Press F12** to open developer console
4. **Click**: "Sign in with Google" button

**This time it should:**
- ✅ Redirect to Google's login page
- ✅ No more "Failed to fetch" error

### 4. If Still Not Working

If you still see errors, try this in the browser console:
```javascript
fetch('http://localhost:5000/api/auth/url')
  .then(r => r.json())
  .then(d => console.log('Success:', d))
  .catch(e => console.error('Error:', e))
```

This will tell us if the backend is reachable.

## Manual Start (If Needed)

If the servers aren't running, start them manually:

**Terminal 1 - Backend:**
```bash
cd C:\Users\sdasa\OneDrive\Documents\GitHub\solis\backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd C:\Users\sdasa\OneDrive\Documents\GitHub\solis\frontend\landing-page
npx http-server -p 8080
```

## Test Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 8080
- [ ] Can access http://localhost:8080 in browser
- [ ] Can access http://localhost:5000/api/health in browser
- [ ] Click "Sign in with Google" button
- [ ] No "Failed to fetch" error
- [ ] Redirects to Google login page

## What the Fix Does

The CORS (Cross-Origin Resource Sharing) policy was blocking requests from port 8080 because the backend was only configured to allow port 3000. Now it accepts requests from:

- ✅ `http://localhost:3000` (React app default)
- ✅ `http://localhost:8080` (Landing page)
- ✅ `http://127.0.0.1:8080` (Alternative localhost format)

This allows the frontend to communicate with the backend properly!

