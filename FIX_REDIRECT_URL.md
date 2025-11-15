# 🔧 Fix OAuth Redirect URL

## Problem
After logging in with Google, you're being redirected to `http://localhost:3000/auth/success` but your landing page is running on `http://localhost:8080`.

## Solution
Update the `CLIENT_URL` in your `.env` file.

---

## Step-by-Step Fix

### 1. Open the `.env` File

Navigate to and open:
```
C:\Users\sdasa\OneDrive\Documents\GitHub\solis\backend\.env
```

### 2. Find This Line
```env
CLIENT_URL=http://localhost:3000
```

### 3. Change It To
```env
CLIENT_URL=http://localhost:8080
```

### 4. Save the File

### 5. Restart the Backend

**In your terminal, run:**
```bash
# Stop the backend (press Ctrl+C if it's running)

# Then restart it:
cd backend
npm run dev
```

---

## Quick Copy-Paste Fix

Just update this one line in `backend/.env`:

**Before:**
```env
CLIENT_URL=http://localhost:3000
```

**After:**
```env
CLIENT_URL=http://localhost:8080
```

---

## After Making This Change

1. **Restart the backend**: `cd backend && npm run dev`
2. **Go back to**: http://localhost:8080
3. **Click "Sign in with Google"** again
4. **This time** you'll be redirected to `http://localhost:8080/auth/success` ✅

---

## Why This Happened

The backend was configured for port 3000 (default React app port) but your landing page runs on port 8080 (http-server). By updating `CLIENT_URL`, the OAuth callback will redirect to the correct location.

---

## Test After Fix

After updating `.env` and restarting:

1. Go to: http://localhost:8080
2. Click "Sign in with Google"
3. Authorize
4. Should redirect to: `http://localhost:8080/auth/success` ✅
5. Then automatically redirect back to landing page (logged in!)

