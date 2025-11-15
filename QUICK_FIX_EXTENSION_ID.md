# 🔧 Quick Fix: Extension ID Not Configured

## Problem

You see: `chrome-extension://your_extension_id/callback.html`

This means the backend doesn't have your actual Extension ID yet!

---

## Solution (2 Steps)

### Step 1: Get Extension ID

1. Open a new tab
2. Go to: `chrome://extensions/`
3. Find **"Solis - Smart Calendar"**
4. Under the extension name, you'll see: **"ID: abcdefgh..."**
5. **Copy that entire ID**

Example of what you're looking for:
```
Solis - Smart Calendar
Version: 1.0.0
ID: abcdefghijklmnopqrstuvwxyz123456  ← COPY THIS
```

---

### Step 2: Configure Backend

1. Open: `backend/.env`

2. Add this line (replace with your actual ID):
   ```env
   EXTENSION_ID=paste_your_copied_id_here
   ```

3. **Save the file**

4. **Restart backend:**
   ```bash
   # Stop current backend (Ctrl+C in terminal)
   # Or run this:
   cd backend
   npm run dev
   ```

---

## Step 3: Try Login Again

1. Click Solis icon
2. Click "Sign in with Google"
3. New tab opens
4. Sign in
5. This time it should redirect to the extension properly!

---

## What Will Happen

After adding the Extension ID:

**Before:** `chrome-extension://your_extension_id/callback.html` ❌

**After:** `chrome-extension://abcdefgh.../callback.html` ✅

The callback page will load properly and send your login info back to the extension!

