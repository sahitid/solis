# How to Create Extension Icons

## Option 1: Use Online Generator (Easiest)

1. Go to: https://favicon.io/favicon-generator/
2. Settings:
   - Text: ☀️ (sun emoji) or just "S"
   - Background: Gradient from #667eea to #764ba2
   - Font: Any modern sans-serif
3. Click "Download"
4. Extract the ZIP
5. Rename the files:
   - Find the 16x16 → rename to `icon16.png`
   - Find the 48x48 → rename to `icon48.png`
   - Find the 128x128 (or create/resize) → `icon128.png`
6. Move all 3 files to `frontend/extension/icons/`

---

## Option 2: Use Paint (Windows)

1. Open Paint
2. Click "Resize" → Set to 128x128 pixels
3. Fill with a color (e.g., purple #764ba2)
4. Add text "S" in white (centered)
5. Save as `icon128.png` in `frontend/extension/icons/`
6. Repeat for 48x48 → `icon48.png`
7. Repeat for 16x16 → `icon16.png`

---

## Option 3: Download Free Icons

1. Go to: https://www.flaticon.com/
2. Search for "sun" or "calendar"
3. Download in PNG format
4. Use an online resizer: https://www.simpleimageresizer.com/
5. Create 3 sizes: 16x16, 48x48, 128x128
6. Save to `frontend/extension/icons/`

---

## Temporary Placeholder (Testing Only)

If you just want to test quickly, create 3 simple files:

```powershell
# Run in PowerShell
cd frontend/extension/icons

# Create dummy files (will show as broken icons but extension still works)
New-Item icon16.png -ItemType File
New-Item icon48.png -ItemType File
New-Item icon128.png -ItemType File
```

⚠️ This won't show proper icons, but the extension will load and work!

---

## Required Sizes

- **16x16** - Shown in browser toolbar (small)
- **48x48** - Shown in Extensions page
- **128x128** - Shown in Chrome Web Store (if you publish)

All should be **PNG format** with transparent or colored background.

