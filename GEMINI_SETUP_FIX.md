# Gemini API Setup - Fix Required

## ⚠️ Issue Detected

None of the Gemini models are accessible with your current API key. This usually means:

1. The **Generative Language API** is not enabled
2. The API key needs proper permissions
3. The API key might be restricted

---

## ✅ Solution: Enable the Generative Language API

### Option 1: Through Google AI Studio (Recommended)

1. **Go to Google AI Studio:**
   - https://aistudio.google.com/app/apikey

2. **Check your API key:**
   - Click on the API key you created
   - Make sure it says "Active"

3. **Create a NEW API key if needed:**
   - Click "Create API Key"
   - Select "**Create API key in new project**"
   - This automatically enables the required APIs

### Option 2: Through Google Cloud Console

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com

2. **Select your project** (the one where you created the API key)

3. **Enable the Generative Language API:**
   - Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
   - Click the blue "**ENABLE**" button
   - Wait 1-2 minutes for it to activate

4. **Verify API is enabled:**
   - Go to "APIs & Services" → "Enabled APIs"
   - Look for "Generative Language API"
   - Should show as "Enabled"

---

## 🔑 Alternative: Try a Fresh API Key

Sometimes it's easier to start fresh:

### Steps:

1. **Go to Google AI Studio:**
   ```
   https://aistudio.google.com/app/apikey
   ```

2. **Delete old key (optional)**

3. **Create new API key:**
   - Click "Get API key" or "Create API key"
   - Choose "Create API key in **new project**"
   - Copy the new key

4. **Update your `.env` file:**
   ```env
   GEMINI_API_KEY=AIzaSy...your_new_key_here
   ```

5. **Test again:**
   ```bash
   node test-gemini.js
   ```

---

## 🧪 Quick Test

After enabling the API or creating a new key, test with:

```bash
cd backend
node test-gemini.js
```

You should see:
```
✅ SUCCESS! Gemini API is working!
```

---

## 🔍 Debug: Check Your API Key

Let's verify your API key is in the `.env` file:

```bash
# In PowerShell (from backend directory)
Get-Content .env | Select-String "GEMINI"
```

Should show:
```
GEMINI_API_KEY=AIzaSy...
```

**Important checks:**
- ✅ Key starts with `AIzaSy`
- ✅ No spaces before or after the key
- ✅ No quotes around the key
- ✅ Key is about 39 characters long

---

## 📝 Correct `.env` Format

```env
# Google Gemini API
GEMINI_API_KEY=AIzaSyDabcdef1234567890_example_key_here
```

**NOT:**
```env
# WRONG - Has quotes
GEMINI_API_KEY="AIzaSy..."

# WRONG - Has spaces  
GEMINI_API_KEY = AIzaSy...

# WRONG - Placeholder not replaced
GEMINI_API_KEY=your-gemini-api-key-here
```

---

## 🎯 Recommended Steps (In Order)

### Step 1: Create Fresh API Key
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API key in new project"
3. **This automatically enables all required APIs!** ✨
4. Copy the key

### Step 2: Update .env
1. Open `backend/.env`
2. Replace the `GEMINI_API_KEY` line with your new key
3. Save (Ctrl+S)

### Step 3: Test
```bash
node test-gemini.js
```

---

## 💡 Why "Create in new project" Works Best

When you create an API key in a **new project** through Google AI Studio:
- ✅ Generative Language API is auto-enabled
- ✅ Proper permissions are set
- ✅ No configuration needed
- ✅ Works immediately

---

## 🆘 Still Not Working?

If you still get errors after trying the above:

### Check 1: API Key Format
Your key should look like: `AIzaSyD...` (starts with AIzaSy)

### Check 2: Internet Connection
Make sure you can access: https://generativelanguage.googleapis.com

### Check 3: Quotas
- Free tier: 60 requests per minute
- If you've been testing a lot, wait 1 minute

### Check 4: API Key Restrictions
1. Go to Google Cloud Console
2. Find your API key
3. Click "Edit"
4. Under "API restrictions": Choose "Don't restrict key" (for development)
5. Under "Application restrictions": Choose "None"
6. Save

---

## ✅ Success Indicators

When it works, you'll see:

```bash
$ node test-gemini.js

🤖 Testing Gemini API...

📝 Testing event parsing with: "Coffee with John tomorrow at 3pm"

✅ SUCCESS! Gemini API is working!

📄 Response from Gemini:
──────────────────────────────────────────────────
{
  "title": "Coffee with John",
  "startDateTime": "2025-11-16T15:00:00",
  ...
}
──────────────────────────────────────────────────

🎉 Your Gemini API key is configured correctly!
```

---

## 📞 Next Steps After Fix

Once Gemini works:
1. ✅ Event parsing will work
2. ✅ AI preference setup will work
3. ⏳ Still need Google OAuth for authentication
4. ⏳ Still need Google Calendar/Gmail APIs for sync

---

**TL;DR:** Go to https://aistudio.google.com/app/apikey → Create API key in **new project** → Copy → Paste in `.env` → Test

