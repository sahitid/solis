# Environment Setup Guide

## MongoDB Atlas Connection - CONFIGURED ✅

Your MongoDB Atlas connection string has been prepared. Follow these steps:

### 1. Create `.env` File

In the `backend` directory, create a file named `.env` (if it doesn't exist) with this content:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB Atlas Connection (CONFIGURED)
MONGO_URI=mongodb+srv://laasyachevendra_db_user:rRMCfnVoVdoemqQ6@cluster0.rkbbkcn.mongodb.net/solis?retryWrites=true&w=majority&appName=Cluster0

# Google OAuth (TO BE ADDED)
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback

# Google API Key (TO BE ADDED)
GOOGLE_API_KEY=your-google-api-key-here

# Google Calendar ID
GOOGLE_CALENDAR_ID=primary

# Google Gemini API (TO BE ADDED)
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: Periodic Calendar Sync
ENABLE_PERIODIC_SYNC=true
SYNC_INTERVAL_MINUTES=15
```

### 2. What's Configured

✅ **MongoDB Atlas Connection**
- Database: `solis`
- Cluster: `cluster0.rkbbkcn.mongodb.net`
- User: `laasyachevendra_db_user`
- Connection options optimized for Atlas

### 3. What You Still Need to Add

#### A. Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URI: `http://localhost:5000/api/auth/callback`
7. Copy the **Client ID** and **Client Secret**
8. Replace in `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_actual_client_secret
   ```

#### B. Enable Google APIs

In the same Google Cloud project:
1. Go to **APIs & Services** → **Library**
2. Enable these APIs:
   - ✅ Google Calendar API
   - ✅ Gmail API
   - ✅ Google+ API (for profile info)

#### C. Google Gemini API Key

**Easiest Method:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the key
4. Replace in `.env`:
   ```env
   GEMINI_API_KEY=your_actual_gemini_key
   ```

### 4. Test MongoDB Connection

After creating the `.env` file:

```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Atlas connected successfully
   Database: solis
```

### 5. Verify Connection

Test the health endpoint:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "Server is running",
  "timestamp": "2025-11-15T..."
}
```

## MongoDB Atlas Setup Notes

### Database Name
- The connection string includes `/solis` which creates/uses a database named "solis"
- This database will be automatically created when you insert the first document

### IP Whitelist
If you get connection timeout errors:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click on your cluster
3. Go to **Network Access**
4. Click **Add IP Address**
5. Choose **Allow Access from Anywhere** (0.0.0.0/0) for development
   - Or add your specific IP address for better security

### User Permissions
Your user `laasyachevendra_db_user` should have:
- Read and write access to the `solis` database
- If you get permission errors, check user privileges in Atlas

## Security Notes

⚠️ **Important**: Never commit the `.env` file to Git!

The `.env` file is already in `.gitignore`, so it won't be tracked. This file contains:
- Database credentials
- API keys
- OAuth secrets

Keep these secure!

## Troubleshooting

### Error: "MongooseServerSelectionError"
**Cause**: Can't reach MongoDB Atlas

**Solutions**:
1. Check internet connection
2. Verify IP is whitelisted in Atlas
3. Check connection string is correct
4. Ensure MongoDB Atlas cluster is running

### Error: "Authentication failed"
**Cause**: Wrong username or password

**Solutions**:
1. Verify credentials in Atlas
2. Check for special characters in password (might need URL encoding)
3. Recreate database user if needed

### Error: "ECONNREFUSED"
**Cause**: Trying to connect to local MongoDB instead of Atlas

**Solution**:
- Make sure MONGO_URI starts with `mongodb+srv://` (not `mongodb://`)

### Error: "Database name required"
**Cause**: Missing database name in connection string

**Solution**:
- Connection string must include `/solis` after the cluster URL
- Current string is correct: `...mongodb.net/solis?...`

## Quick Start Checklist

- [x] MongoDB Atlas connection string configured
- [ ] Create `backend/.env` file with the configuration above
- [ ] Get Google OAuth credentials
- [ ] Enable Google Calendar & Gmail APIs
- [ ] Get Gemini API key
- [ ] Start backend server: `npm run dev`
- [ ] Verify MongoDB connection in terminal output

## Next Steps

Once MongoDB is connected (you should see ✅ in terminal):

1. **Test Authentication**:
   - Try the OAuth flow
   - Create a user account

2. **Test Event Creation**:
   - Parse an event with natural language
   - Save to database
   - Verify in MongoDB Atlas

3. **Check Database**:
   - Go to MongoDB Atlas
   - Browse Collections
   - You should see: `users`, `events`, `rescheduleproposals`

---

**Current Status**: 
- ✅ MongoDB Atlas configured
- ⏳ Google APIs pending
- ⏳ Gemini API pending

See `INTEGRATION_GUIDE.md` for complete setup instructions.

