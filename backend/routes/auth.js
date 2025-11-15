const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const User = require('../models/User');
const { oauth2Client, getAuthUrl, getAuthenticatedClient } = require('../config/google');

// @route   GET /api/auth/google
// @desc    Get Google OAuth URL
// @access  Public
router.get('/google', (req, res) => {
  try {
    const authUrl = getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

// @route   POST /api/auth/google/callback
// @desc    Handle Google OAuth callback
// @access  Public
router.post('/google/callback', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
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
      user.GCal_ID = id;
      await user.save();
    } else {
      // Create new user
      user = new User({
        Full_Name: name,
        Email: email,
        GCal_ID: id,
        OAuth_Token: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date
        },
        // Set default work hours (9 AM - 5 PM weekdays)
        Work_Hours: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
          saturday: { start: '', end: '' },
          sunday: { start: '', end: '' }
        }
      });
      await user.save();
    }

    res.json({
      success: true,
      user: {
        email: user.Email,
        name: user.Full_Name,
        onboardingCompleted: user.Onboarding_Completed
      },
      tokens
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token
// @access  Private
router.post('/refresh-token', async (req, res) => {
  const { email, refreshToken } = req.body;

  if (!email || !refreshToken) {
    return res.status(400).json({ error: 'Email and refresh token are required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Set refresh token and get new access token
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update user's tokens
    user.OAuth_Token = {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || refreshToken,
      scope: credentials.scope,
      token_type: credentials.token_type,
      expiry_date: credentials.expiry_date
    };
    await user.save();

    res.json({
      success: true,
      tokens: credentials
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token', details: error.message });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and revoke tokens
// @access  Private
router.post('/logout', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Revoke Google tokens
    if (user.OAuth_Token && user.OAuth_Token.access_token) {
      const client = getAuthenticatedClient(user.OAuth_Token);
      await client.revokeCredentials();
    }

    // Clear tokens from database
    user.OAuth_Token = {
      access_token: '',
      refresh_token: '',
      scope: '',
      token_type: '',
      expiry_date: 0
    };
    await user.save();

    res.json({ success: true, message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed', details: error.message });
  }
});

// @route   GET /api/auth/status
// @desc    Check authentication status
// @access  Public
router.get('/status', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ Email: email });
    
    if (!user) {
      return res.json({ authenticated: false });
    }

    const isAuthenticated = user.OAuth_Token && 
                           user.OAuth_Token.access_token && 
                           user.OAuth_Token.expiry_date > Date.now();

    res.json({
      authenticated: isAuthenticated,
      onboardingCompleted: user.Onboarding_Completed,
      user: {
        name: user.Full_Name,
        email: user.Email
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;

