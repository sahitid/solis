# 🆔 Extension ID Setup - Final Step

## What You Need

After loading the extension in Chrome, you need to get its **Extension ID** and add it to the backend.

---

## Step 1: Get Your Extension ID

1. Go to `chrome://extensions/`
2. Find "Solis - Smart Calendar"
3. You'll see an **ID** below the extension name
   - It looks like: `abcdefghijklmnopqrstuvwxyz123456`
   - It's a long random string

**Copy this ID!**

---

## Step 2: Add to Backend .env

Open `backend/.env` and add this line:

```env
EXTENSION_ID=paste_your_extension_id_here
```

**Example:**
```env
EXTENSION_ID=abcdefghijklmnopqrstuvwxyz123456
```

---

## Step 3: Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services > Credentials**
3. Click your OAuth 2.0 Client ID
4. In **"Authorized redirect URIs"**, add:
   ```
   chrome-extension://YOUR_EXTENSION_ID_HERE/callback.html
   ```
   
   **Example:**
   ```
   chrome-extension://abcdefghijklmnopqrstuvwxyz123456/callback.html
   ```

5. Click **Save**

---

## Step 4: Restart Backend

```bash
cd backend
npm run dev
```

---

## Step 5: Test Sign In

1. Click Solis extension icon
2. Click "Sign in with Google"
3. New tab opens with Google sign-in
4. Sign in with your account
5. Grant permissions
6. Tab shows "Sign in successful!"
7. Go back to extension
8. You should be logged in! ✅

---

## 🎯 Quick Checklist

- [ ] Extension loaded in Chrome
- [ ] Copied Extension ID
- [ ] Added `EXTENSION_ID` to `backend/.env`
- [ ] Added redirect URI to Google OAuth consent screen
- [ ] Restarted backend
- [ ] Tested sign-in flow

---

## 🐛 Troubleshooting

### "redirect_uri_mismatch" error

**Fix:** Double-check the redirect URI in Google Console matches:
```
chrome-extension://YOUR_ACTUAL_EXTENSION_ID/callback.html
```

### Still redirecting to wrong URL

**Fix:** Make sure `EXTENSION_ID` in `.env` matches the actual ID from `chrome://extensions/`

### Backend not picking up EXTENSION_ID

**Fix:** Restart the backend after editing `.env`

---

**Once this is done, OAuth will work perfectly! 🚀**

