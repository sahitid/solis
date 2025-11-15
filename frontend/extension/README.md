# Solis Chrome Extension

## Quick Setup

### 1. Create Icons

You need 3 PNG icon files. Create them in the `icons/` folder:

```
frontend/extension/icons/
  ├── icon16.png   (16x16 pixels)
  ├── icon48.png   (48x48 pixels)
  └── icon128.png  (128x128 pixels)
```

**Quick method:** Use any online icon generator or create simple colored squares in Paint/Photoshop.

**Recommended:** Use the ☀️ sun emoji as your icon theme.

### 2. Update manifest.json

Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Google OAuth Client ID from Google Cloud Console.

### 3. Load in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this folder: `frontend/extension/`
5. Done! The extension should appear in your toolbar.

### 4. Test It

1. Click the Solis icon in Chrome toolbar
2. Click "Sign in with Google"
3. Grant permissions
4. Start adding events!

---

## Files

- **manifest.json** - Extension configuration
- **popup.html** - UI with login and app screens
- **popup.js** - Main logic (auth, event creation)
- **background.js** - Service worker (API calls)
- **styles.css** - Notion-inspired styling
- **icons/** - Extension icons

---

## Features

✅ Google OAuth authentication
✅ Calendar ID auto-detection
✅ Auto-create user in MongoDB
✅ Add events with flexibility levels
✅ Multi-attendee support
✅ Clean, modern UI
✅ Login required (secure)

---

## Backend API

The extension connects to: `http://localhost:5000/api`

Endpoints used:
- `POST /api/auth/register` - Register/update user
- `POST /api/events/create` - Create calendar event
- `GET /api/auth/user` - Get user info

Make sure backend is running before testing!

