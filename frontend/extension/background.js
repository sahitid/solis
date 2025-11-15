// Background service worker for Solis extension

const API_BASE = 'http://localhost:5000/api';

// Listen for OAuth token from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'createUser') {
    createUserInDatabase(request.userData)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'getCalendarId') {
    getCalendarId(request.accessToken)
      .then(calendarId => sendResponse({ success: true, calendarId }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Get user's primary calendar ID
async function getCalendarId(accessToken) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get calendar ID');
  }
  
  const data = await response.json();
  return data.id;
}

// Create user in MongoDB database
async function createUserInDatabase(userData) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create user');
  }
  
  return await response.json();
}

// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  console.log('Solis extension installed');
});

