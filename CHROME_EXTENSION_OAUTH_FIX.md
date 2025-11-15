# 🔧 Chrome Extension OAuth Not Working - Fix Guide

## 🐛 Issue
Clicking "Sign in with Google" button doesn't open OAuth popup.

## ✅ Quick Debugging Steps

### Step 1: Check Console for Errors

1. **Open the extension popup** (click Solis icon)
2. **Right-click anywhere** in the popup
3. **Click "Inspect"** (this opens DevTools for the popup)
4. **Check the Console tab** for errors

**Common errors you might see:**
- `"OAuth2 not granted or revoked"`
- `"invalid_client"`
- `"Error: Could not find Client ID"`

**Screenshot what you see and we can fix it!**

### Step 2: Verify Extension Loaded Correctly

1. Go to `chrome://extensions/`
2. Find "Solis - Smart Calendar"
3. Check for any **red error badges**
4. If there are errors, click "Errors" to see them

---

## 🔑 Critical: Chrome Extension OAuth Setup

**IMPORTANT:** Chrome extensions need a **different type** of OAuth client than web apps!

### Option A: Use Web-Based OAuth (Easier - Recommended)

Since `chrome.identity` API can be complex, let's use a simpler web-based OAuth flow that definitely works.

I'll update the extension to use the traditional OAuth flow (like the old website did).

**Would you like me to implement this? It's more reliable.**

### Option B: Configure Chrome Identity API (Current Approach)

If you want to continue with Chrome Identity API, here's what you need:

#### 1. Get Your OAuth Client ID

From Google Cloud Console:
1. Go to https://console.cloud.google.com/
2. Select your project
3. **APIs & Services > Credentials**
4. You should see your OAuth 2.0 Client ID

**Copy the FULL Client ID** (including `.apps.googleusercontent.com`)

#### 2. Update manifest.json

**Current (line 15):**
```json
"client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
```

**Change to (example):**
```json
"client_id": "123456789-abc123xyz.apps.googleusercontent.com",
```

#### 3. Reload Extension

After updating manifest.json:
1. Go to `chrome://extensions/`
2. Find Solis
3. Click the **refresh icon** 🔄
4. Try signing in again

---

## 🔍 Detailed Diagnostics

### Check 1: Is the Client ID in manifest.json?

**Run this in the extension console:**
```javascript
console.log(chrome.runtime.getManifest().oauth2.client_id);
```

**Expected:** Your actual Client ID  
**Problem:** If you see `"YOUR_GOOGLE_CLIENT_ID..."`, it's not updated

### Check 2: Are permissions granted?

**Run this:**
```javascript
chrome.identity.getAuthToken({ interactive: false }, (token) => {
  console.log('Token:', token);
  console.log('Error:', chrome.runtime.lastError);
});
```

**Expected:** Either a token or a clear error message  
**This tells us exactly what's wrong**

---

## 🚀 Recommended Solution: Web OAuth Flow

The `chrome.identity` API can be tricky and has limitations. I recommend switching to a **web-based OAuth flow** which is:
- ✅ More reliable
- ✅ Works with your existing Google OAuth setup
- ✅ No special Chrome app configuration needed
- ✅ Better error messages

**How it works:**
1. User clicks "Sign in with Google"
2. Opens new tab with OAuth URL
3. User signs in
4. Redirects back to extension with token
5. Extension saves token and shows app screen

**Should I implement this instead?** It'll take 5 minutes and is guaranteed to work.

---

## 🐛 Common Errors & Fixes

### Error: "OAuth2 not granted or revoked"

**Cause:** Client ID not set or incorrect  
**Fix:** Update manifest.json with correct Client ID, reload extension

### Error: "invalid_client"

**Cause:** Client ID doesn't exist or is for wrong project  
**Fix:** Double-check you copied the correct Client ID from the right Google Cloud project

### Error: "redirect_uri_mismatch"

**Cause:** Chrome extensions need specific redirect URIs  
**Fix:** Add `https://<extension-id>.chromiumapp.org/` to your OAuth consent screen

### Nothing happens, no error

**Cause:** JavaScript error preventing button click  
**Fix:** Check console in DevTools (right-click popup → Inspect)

---

## 💡 Quick Test

**Open the extension popup, then run this in the console:**

```javascript
// Test if chrome.identity API is available
console.log('Identity API:', chrome.identity);

// Test button click handler
document.getElementById('loginBtn').addEventListener('click', () => {
  console.log('Button clicked!');
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      console.error('Auth error:', chrome.runtime.lastError);
    } else {
      console.log('Got token:', token);
    }
  });
});
```

**This will show us exactly where the problem is!**

---

## 🎯 Next Steps

**Tell me:**
1. What errors do you see in the console?
2. Do you have a Google OAuth Client ID ready?
3. Should I switch to web-based OAuth (recommended)?

I'll fix this for you! 🚀

