const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const User = require('../models/User');
const { oauth2Client, getAuthUrl } = require('../config/google');

// @route   GET /api/auth/url
// @desc    Get Google OAuth URL for extension
// @access  Public
router.get('/url', (req, res) => {
  try {
    const url = getAuthUrl();
    res.json({ success: true, url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ success: false, error: 'Failed to generate authentication URL' });
  }
});

// @route   GET /api/auth/callback
// @desc    Handle Google OAuth callback
// @access  Public
// @route   GET /api/auth/success
// @desc    Success page after OAuth (serves HTML that communicates with extension)
// @access  Public
router.get('/success', (req, res) => {
  const { user, error } = req.query;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Solis - Sign In Success</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          color: white;
        }
        .container { text-align: center; max-width: 500px; padding: 40px; }
        .logo { font-size: 80px; margin-bottom: 24px; animation: bounce 1s ease-in-out; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        h1 { font-size: 32px; margin-bottom: 16px; }
        p { font-size: 18px; opacity: 0.9; margin-bottom: 32px; }
        .status {
          background: rgba(255, 255, 255, 0.2);
          padding: 16px 24px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          margin-bottom: 24px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .success-icon { font-size: 48px; margin-bottom: 16px; }
        .error { background: rgba(255, 0, 0, 0.2); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">☀️</div>
        <h1>Solis</h1>
        
        <div id="status" class="status">
          <div class="spinner"></div>
          <p>Completing sign in...</p>
        </div>
      </div>
      
      <script>
        const urlParams = new URLSearchParams(window.location.search);
        const userDataEncoded = urlParams.get('user');
        const error = urlParams.get('error');
        const statusDiv = document.getElementById('status');
        
        if (error) {
          statusDiv.innerHTML = '<div class="success-icon">❌</div><p><strong>Sign in failed</strong></p><p style="font-size: 14px;">Please close this tab and try again.</p>';
        } else if (userDataEncoded) {
          try {
            const userData = JSON.parse(decodeURIComponent(userDataEncoded));
            
            // Try to communicate with extension
            if (chrome && chrome.runtime) {
              chrome.runtime.sendMessage('${process.env.EXTENSION_ID}', {
                action: 'authSuccess',
                userData: userData
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.log('Extension not listening, saving to localStorage');
                  localStorage.setItem('solis_user', JSON.stringify(userData));
                }
              });
            }
            
            // Also save to localStorage as backup
            localStorage.setItem('solis_user', JSON.stringify(userData));
            
            statusDiv.innerHTML = '<div class="success-icon">✅</div><p><strong>Sign in successful!</strong></p><p style="font-size: 14px;">Click the Solis extension icon to continue.</p><p style="font-size: 12px; margin-top: 16px;">You can close this tab now.</p>';
            
            // Auto-close after 5 seconds
            setTimeout(() => {
              window.close();
            }, 5000);
          } catch (err) {
            statusDiv.innerHTML = '<div class="success-icon">❌</div><p><strong>Error processing login</strong></p>';
          }
        } else {
          statusDiv.innerHTML = '<div class="success-icon">❌</div><p><strong>No user data received</strong></p>';
        }
      </script>
    </body>
    </html>
  `);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`http://localhost:5000/api/auth/success?error=no_code`);
  }

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });

    const userInfo = await oauth2.userinfo.get();
    const { email, name, id } = userInfo.data;

    // Get calendar ID
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.get({ calendarId: 'primary' });
    const calendarId = calendarList.data.id;

    // Check if user exists
    let user = await User.findOne({ Email: email });

    if (user) {
      // Update existing user's tokens
      user.OAuth_Token = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || user.OAuth_Token.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date
      };
      user.GCal_ID = calendarId;
      await user.save();
    } else {
      // Create new user
      user = new User({
        Full_Name: name,
        Email: email,
        GCal_ID: calendarId,
        OAuth_Token: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date
        },
        Events: []
      });
      await user.save();
    }

    console.log(`✅ User authenticated: ${email}`);

    // Redirect to localhost success page with user data
    const userData = {
      Full_Name: user.Full_Name,
      Email: user.Email,
      GCal_ID: user.GCal_ID,
      OAuth_Token: user.OAuth_Token
    };

    const userDataEncoded = encodeURIComponent(JSON.stringify(userData));
    
    // Redirect to localhost success page (works with Google OAuth)
    res.redirect(`http://localhost:5000/api/auth/success?user=${userDataEncoded}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`http://localhost:5000/api/auth/success?error=auth_failed`);
  }
});

// @route   POST /api/auth/register
// @desc    Register new user from Chrome extension
// @access  Public
router.post('/register', async (req, res) => {
  const { Full_Name, Email, OAuth_Token, GCal_ID, Events } = req.body;

  if (!Full_Name || !Email || !OAuth_Token || !GCal_ID) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields: Full_Name, Email, OAuth_Token, GCal_ID' 
    });
  }

  try {
    // Check if user already exists
    let user = await User.findOne({ Email });

    if (user) {
      // Update existing user's OAuth token
      user.OAuth_Token = OAuth_Token;
      user.Full_Name = Full_Name;
      user.GCal_ID = GCal_ID;
      await user.save();

      return res.json({
        success: true,
        message: 'User updated successfully',
        user: {
          Full_Name: user.Full_Name,
          Email: user.Email,
          GCal_ID: user.GCal_ID
        }
      });
    }

    // Create new user
    user = new User({
      Full_Name,
      Email,
      OAuth_Token,
      GCal_ID,
      Events: Events || []
    });

    await user.save();

    console.log(`✅ New user registered: ${Email}`);

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        Full_Name: user.Full_Name,
        Email: user.Email,
        GCal_ID: user.GCal_ID
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to register user', 
      details: error.message 
    });
  }
});

// @route   GET /api/auth/user
// @desc    Get user by email
// @access  Public
router.get('/user', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ Email: email }).populate('Events');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        Full_Name: user.Full_Name,
        Email: user.Email,
        GCal_ID: user.GCal_ID,
        Events: user.Events
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
