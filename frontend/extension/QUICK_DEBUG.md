# 🔍 Quick Debug: OAuth Not Working

## Step 1: Check Console

1. Click the Solis extension icon
2. Right-click anywhere in the popup
3. Click **"Inspect"**
4. Look at the **Console** tab

**What errors do you see?**

## Step 2: Test OAuth API

In the console, paste this:

```javascript
chrome.identity.getAuthToken({ interactive: true }, (token) => {
  if (chrome.runtime.lastError) {
    console.error('ERROR:', chrome.runtime.lastError.message);
  } else {
    console.log('SUCCESS! Token:', token);
  }
});
```

**What does it print?**

## Common Results:

### ❌ "OAuth2 not granted or revoked"
→ You need to update `manifest.json` with your Client ID

### ❌ "invalid_client"  
→ Client ID is wrong or doesn't exist

### ✅ Got a token!
→ OAuth works! Issue is elsewhere in the code

---

**Send me the error message and I'll fix it!**

