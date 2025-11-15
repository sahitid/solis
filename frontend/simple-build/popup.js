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

// Parse event with AI
async function parseEvent() {
  const input = document.getElementById('eventInput').value.trim();
  
  if (!input) {
    showMessage('⚠️ Please enter an event description', 'error');
    return;
  }
  
  const parseBtn = document.getElementById('parseBtn');
  parseBtn.disabled = true;
  parseBtn.textContent = '🔄 Parsing...';
  
  try {
    const response = await fetch(`${API_BASE}/events/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userInput: input,
        email: 'test@example.com' // You can add actual user email from storage
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      displayParsedEvent(data.event);
      showMessage('✅ Event parsed successfully!', 'success');
    } else {
      showMessage('❌ Could not parse event', 'error');
    }
  } catch (error) {
    showMessage('❌ Error: ' + error.message, 'error');
  } finally {
    parseBtn.disabled = false;
    parseBtn.textContent = '🤖 Parse Event';
  }
}

// Display parsed event
function displayParsedEvent(event) {
  const section = document.getElementById('parsedEventSection');
  section.innerHTML = `
    <div class="parsed-event">
      <h3>Parsed Event Details</h3>
      <div class="event-field"><strong>Title:</strong> ${event.title}</div>
      <div class="event-field"><strong>Start:</strong> ${formatDateTime(event.startDateTime)}</div>
      <div class="event-field"><strong>End:</strong> ${formatDateTime(event.endDateTime)}</div>
      <div class="event-field"><strong>Category:</strong> ${event.category}</div>
      <div class="event-field"><strong>Priority:</strong> ${event.priority}</div>
      <div class="event-field"><strong>Flexibility:</strong> ${event.flexibility}</div>
      ${event.description ? `<div class="event-field"><strong>Description:</strong> ${event.description}</div>` : ''}
      <button onclick="createEvent()" style="margin-top: 12px; background: #0f7b6c;">
        ✅ Add to Calendar
      </button>
    </div>
  `;
}

// Create event
async function createEvent() {
  showMessage('Creating event...', 'success');
  
  try {
    // Implementation here - call backend API to create event
    showMessage('✅ Event would be created! (Connect OAuth first)', 'success');
  } catch (error) {
    showMessage('❌ Failed to create event', 'error');
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
});

