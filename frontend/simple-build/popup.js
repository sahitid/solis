const API_BASE = 'http://localhost:5000/api';

// Switch tabs
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById(tabName).classList.add('active');
}

// Login with Google
async function login() {
  try {
    showMessage('Connecting to Google...', 'success', 'settingsMessage');
    
    // Open OAuth flow
    window.open(`${API_BASE}/auth/google`, '_blank');
    
    showMessage('✅ Please complete sign-in in the opened window', 'success', 'settingsMessage');
  } catch (error) {
    showMessage('❌ Login failed: ' + error.message, 'error', 'settingsMessage');
  }
}

// Handle form submission
document.getElementById('eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await createEvent();
});

// Set default dates to today
function setDefaultDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  document.getElementById('startDate').value = formatDate(today);
  document.getElementById('endDate').value = formatDate(today);
  document.getElementById('startTime').value = '09:00';
  document.getElementById('endTime').value = '10:00';
}

// Cancel form
function cancelForm() {
  document.getElementById('eventForm').reset();
  setDefaultDates();
  showMessage('Form cleared', 'success');
}

// Create event
async function createEvent() {
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitLoader = document.getElementById('submitLoader');
  
  // Get form values
  const eventName = document.getElementById('eventName').value.trim();
  const startDate = document.getElementById('startDate').value;
  const startTime = document.getElementById('startTime').value;
  const endDate = document.getElementById('endDate').value;
  const endTime = document.getElementById('endTime').value;
  const description = document.getElementById('eventDescription').value.trim();
  const flexibility = document.getElementById('eventFlexibility').value;
  const guestsInput = document.getElementById('eventGuests').value.trim();
  
  // Validate required fields
  if (!eventName || !startDate || !startTime || !endDate || !endTime || !flexibility) {
    showMessage('⚠️ Please fill in all required fields', 'error');
    return;
  }
  
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
  
  // Validate times
  if (new Date(endDateTime) <= new Date(startDateTime)) {
    showMessage('⚠️ End time must be after start time', 'error');
    return;
  }
  
  // Show loading state
  submitBtn.disabled = true;
  submitText.style.display = 'none';
  submitLoader.style.display = 'block';
  
  try {
    // Get user email from storage
    const result = await chrome.storage.local.get(['user']);
    const userEmail = result.user?.email || 'test@example.com';
    
    // Create event data
    const eventData = {
      title: eventName,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      description: description,
      flexibility: flexibility,
      attendees: guests,
      priority: 2, // Default priority
      category: guests.length > 0 ? 'meeting' : 'personal'
    };
    
    // Call backend API
    const response = await fetch(`${API_BASE}/events/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: userEmail,
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
      // Conflict detected
      showMessage(`⚠️ Conflict detected with ${data.conflictCount} event(s)! Check your calendar.`, 'error');
      // In a full implementation, we'd show the conflict modal here
    } else {
      showMessage('❌ ' + (data.error || 'Failed to create event'), 'error');
    }
  } catch (error) {
    console.error('Error creating event:', error);
    showMessage('❌ Error: ' + error.message, 'error');
  } finally {
    // Reset loading state
    submitBtn.disabled = false;
    submitText.style.display = 'inline';
    submitLoader.style.display = 'none';
  }
}

// Show message
function showMessage(text, type, elementId = 'message') {
  const messageEl = document.getElementById(elementId);
  messageEl.className = `message ${type}`;
  messageEl.textContent = text;
  messageEl.style.display = 'block';
  
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

// Format date/time
function formatDateTime(dt) {
  const date = new Date(dt);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

// Check if user is logged in
async function checkAuth() {
  try {
    // Check storage for user data
    chrome.storage.local.get(['user'], (result) => {
      if (result.user) {
        displayUser(result.user);
      }
    });
  } catch (error) {
    console.error('Auth check failed:', error);
  }
}

// Display user info
function displayUser(user) {
  document.getElementById('userInfo').style.display = 'flex';
  document.getElementById('userAvatar').textContent = user.name.charAt(0);
  document.getElementById('userName').textContent = user.name;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setDefaultDates();
});

