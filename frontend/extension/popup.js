// Popup script for Solis extension

const API_BASE = 'http://localhost:5000/api';

// State
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupEventListeners();
  setDefaultDates();
});

// Check if user is authenticated
async function checkAuth() {
  try {
    // Check if we have user data in storage
    const result = await chrome.storage.local.get(['user']);
    
    if (result.user) {
      currentUser = result.user;
      showAppScreen();
      updateUserInfo();
    } else {
      // Also check if there's user data waiting from OAuth (in case message didn't get through)
      checkForPendingAuth();
      showLoginScreen();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showLoginScreen();
  }
}

// Check for pending auth from OAuth success page
async function checkForPendingAuth() {
  try {
    // Query the success page tab if it exists
    const tabs = await chrome.tabs.query({ url: 'http://localhost:5000/api/auth/success*' });
    
    if (tabs.length > 0) {
      // Execute script to get user data from localStorage
      const result = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const userData = localStorage.getItem('solis_user');
          localStorage.removeItem('solis_user');
          return userData;
        }
      });
      
      if (result && result[0] && result[0].result) {
        const userData = JSON.parse(result[0].result);
        currentUser = userData;
        await chrome.storage.local.set({ user: currentUser });
        showAppScreen();
        updateUserInfo();
        showMessage('✅ Successfully signed in!', 'success');
        
        // Close the success tab
        chrome.tabs.remove(tabs[0].id);
      }
    }
  } catch (error) {
    console.error('Error checking for pending auth:', error);
  }
}

// Show login screen
function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
}

// Show app screen
function showAppScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
}

// Update user info in UI
function updateUserInfo() {
  if (!currentUser) return;
  
  document.getElementById('userName').textContent = currentUser.Full_Name;
  document.getElementById('userEmail').textContent = currentUser.Email;
  document.getElementById('userAvatar').textContent = currentUser.Full_Name.charAt(0).toUpperCase();
}

// Setup event listeners
function setupEventListeners() {
  // Login button
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  
  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  
  // Event form
  document.getElementById('eventForm').addEventListener('submit', handleEventSubmit);
  
  // Cancel button
  document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('eventForm').reset();
    setDefaultDates();
  });
}

// Handle login (web-based OAuth)
async function handleLogin() {
  const loginBtn = document.getElementById('loginBtn');
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="loader"></span> Opening sign in...';
  
  try {
    // Get OAuth URL from backend
    const response = await fetch(`${API_BASE}/auth/url`);
    const data = await response.json();
    
    if (!data.success || !data.url) {
      throw new Error('Failed to get authentication URL');
    }
    
    // Open OAuth in new tab
    chrome.tabs.create({ url: data.url });
    
    // Show message
    showMessage('✅ Sign-in page opened! Complete login and return here.', 'success');
    
  } catch (error) {
    console.error('Login error:', error);
    showMessage('❌ Login failed: ' + error.message, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span class="icon">🔐</span> Sign in with Google';
  }
}

// Listen for messages from callback page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'authSuccess') {
    // User logged in successfully
    currentUser = request.userData;
    chrome.storage.local.set({ user: currentUser }).then(() => {
      showAppScreen();
      updateUserInfo();
      showMessage('✅ Successfully signed in!', 'success');
    });
  }
});

// Handle logout
async function handleLogout() {
  try {
    // Clear storage
    await chrome.storage.local.clear();
    currentUser = null;
    
    // Show login screen
    showLoginScreen();
    showMessage('✅ Logged out successfully', 'success');
    
  } catch (error) {
    console.error('Logout error:', error);
    showMessage('❌ Logout failed', 'error');
  }
}

// Handle event submission
async function handleEventSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitLoader = document.getElementById('submitLoader');
  
  submitBtn.disabled = true;
  submitText.style.display = 'none';
  submitLoader.style.display = 'inline-block';
  
  try {
    // Get form data
    const eventName = document.getElementById('eventName').value.trim();
    const startDate = document.getElementById('startDate').value;
    const startTime = document.getElementById('startTime').value;
    const endDate = document.getElementById('endDate').value;
    const endTime = document.getElementById('endTime').value;
    const description = document.getElementById('eventDescription').value.trim();
    const flexibility = document.getElementById('eventFlexibility').value;
    const guestsInput = document.getElementById('eventGuests').value.trim();
    
    // Parse guests
    const guests = guestsInput 
      ? guestsInput.split(',').map(email => ({
          email: email.trim(),
          name: email.trim().split('@')[0]
        }))
      : [];
    
    // Combine date and time
    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;
    
    // Validate
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      throw new Error('End time must be after start time');
    }
    
    // Create event data
    const eventData = {
      title: eventName,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      description: description,
      flexibility: flexibility,
      attendees: guests,
      priority: 2,
      category: guests.length > 0 ? 'meeting' : 'personal'
    };
    
    // Send to backend
    const response = await fetch(`${API_BASE}/events/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: currentUser.Email,
        eventData: eventData,
        skipConflictCheck: false
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      showMessage('✅ Event added to your calendar!', 'success');
      document.getElementById('eventForm').reset();
      setDefaultDates();
    } else if (response.status === 409) {
      showMessage(`⚠️ Conflict detected with ${data.conflictCount} event(s)!`, 'warning');
    } else {
      throw new Error(data.error || 'Failed to create event');
    }
    
  } catch (error) {
    console.error('Event creation error:', error);
    showMessage('❌ ' + error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitText.style.display = 'inline';
    submitLoader.style.display = 'none';
  }
}

// Set default dates
function setDefaultDates() {
  const today = new Date();
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  document.getElementById('startDate').value = formatDate(today);
  document.getElementById('endDate').value = formatDate(today);
  document.getElementById('startTime').value = '09:00';
  document.getElementById('endTime').value = '10:00';
}

// Show message
function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

