// ===================================
// CONFIGURATION
// ===================================

const API_BASE = 'http://localhost:5000/api';

// State
let currentUser = null;
let conversationHistory = [];

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', () => {
  loadUserFromStorage();
  setupFormListeners();
});

// ===================================
// TAB SWITCHING
// ===================================

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(`${tabName}Tab`).classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
    content.style.display = 'none';
  });
  document.getElementById(tabName).classList.add('active');
  document.getElementById(tabName).style.display = 'block';
}

// ===================================
// AUTHENTICATION
// ===================================

async function initiateGoogleLogin() {
  try {
    showMessage('Initiating Google login...', 'info', 'settingsMessage');
    
    // Open OAuth flow
    const response = await fetch(`${API_BASE}/auth/url`);
    const data = await response.json();
    
    if (data.url) {
      // Open OAuth in new window
      const width = 600;
      const height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;
      
      const authWindow = window.open(
        data.url,
        'Google OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // Poll for OAuth completion
      const pollInterval = setInterval(async () => {
        try {
          if (authWindow.closed) {
            clearInterval(pollInterval);
            // Check if auth was successful
            const statusResponse = await fetch(`${API_BASE}/auth/status`);
            const statusData = await statusResponse.json();
            
            if (statusData.authenticated) {
              handleSuccessfulLogin(statusData.user);
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('❌ Failed to initiate login', 'error', 'settingsMessage');
  }
}

function handleSuccessfulLogin(user) {
  currentUser = user;
  localStorage.setItem('user', JSON.stringify(user));
  
  updateUIForLoggedInUser(user);
  loadUserPreferences();
  checkPermissions();
  
  showMessage('✅ Successfully connected to Google!', 'success', 'settingsMessage');
}

function updateUIForLoggedInUser(user) {
  // Update header
  document.getElementById('loggedOutSection').style.display = 'none';
  document.getElementById('loggedInSection').style.display = 'flex';
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userEmail').textContent = user.email;
  
  // Update account card
  document.getElementById('notConnectedState').style.display = 'none';
  document.getElementById('connectedState').style.display = 'grid';
  document.getElementById('accountAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('accountName').textContent = user.name;
  document.getElementById('accountEmail').textContent = user.email;
}

function loadUserFromStorage() {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    updateUIForLoggedInUser(currentUser);
    loadUserPreferences();
    checkPermissions();
  }
}

async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    
    currentUser = null;
    localStorage.removeItem('user');
    localStorage.removeItem('preferences');
    
    // Reset UI
    document.getElementById('loggedOutSection').style.display = 'block';
    document.getElementById('loggedInSection').style.display = 'none';
    document.getElementById('notConnectedState').style.display = 'flex';
    document.getElementById('connectedState').style.display = 'none';
    
    showMessage('✅ Logged out successfully', 'success', 'settingsMessage');
    switchTab('home');
  } catch (error) {
    console.error('Logout error:', error);
    showMessage('❌ Logout failed', 'error', 'settingsMessage');
  }
}

async function reconnectAccount() {
  await initiateGoogleLogin();
}

async function disconnectAccount() {
  if (confirm('Are you sure you want to disconnect your Google account? Your preferences will be saved.')) {
    await logout();
  }
}

// ===================================
// PERMISSIONS
// ===================================

async function checkPermissions() {
  if (!currentUser) return;
  
  try {
    const response = await fetch(`${API_BASE}/auth/permissions?email=${currentUser.email}`);
    const data = await response.json();
    
    // Update calendar status
    const calendarStatus = document.getElementById('calendarStatus');
    if (data.calendar) {
      calendarStatus.textContent = '✅';
      calendarStatus.title = 'Calendar access granted';
    } else {
      calendarStatus.textContent = '❌';
      calendarStatus.title = 'Calendar access needed';
    }
    
    // Update Gmail status
    const gmailStatus = document.getElementById('gmailStatus');
    if (data.gmail) {
      gmailStatus.textContent = '✅';
      gmailStatus.title = 'Gmail access granted';
    } else {
      gmailStatus.textContent = '❌';
      gmailStatus.title = 'Gmail access needed';
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
  }
}

// ===================================
// LLM CHAT ASSISTANT
// ===================================

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message to chat
  addChatMessage(message, 'user');
  input.value = '';
  
  // Disable send button
  const sendBtn = document.getElementById('chatSendBtn');
  sendBtn.disabled = true;
  sendBtn.textContent = '...';
  
  try {
    // Send to LLM assistant
    const response = await fetch(`${API_BASE}/preferences/llm-assist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userMessage: message,
        conversationHistory: conversationHistory
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Add assistant response
      addChatMessage(data.assistantMessage, 'assistant');
      
      // Update conversation history
      conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: data.assistantMessage }
      );
      
      // If preferences were extracted, update form
      if (data.preferences) {
        updateFormWithPreferences(data.preferences);
      }
    } else {
      addChatMessage('Sorry, I encountered an error. Please try again.', 'assistant');
    }
  } catch (error) {
    console.error('Chat error:', error);
    addChatMessage('Sorry, I encountered an error. Please try again.', 'assistant');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
  }
}

function addChatMessage(text, sender) {
  const chatContainer = document.getElementById('chatContainer');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = sender === 'user' ? (currentUser ? currentUser.name.charAt(0).toUpperCase() : 'U') : '🤖';
  
  const content = document.createElement('div');
  content.className = 'message-content';
  
  // Split text into paragraphs
  const paragraphs = text.split('\n').filter(p => p.trim());
  paragraphs.forEach(p => {
    const pEl = document.createElement('p');
    pEl.textContent = p;
    content.appendChild(pEl);
  });
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  chatContainer.appendChild(messageDiv);
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Allow Enter to send message (Shift+Enter for new line)
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }
});

// ===================================
// PREFERENCES FORM
// ===================================

function setupFormListeners() {
  const form = document.getElementById('preferencesForm');
  if (form) {
    form.addEventListener('submit', savePreferences);
  }
}

async function savePreferences(e) {
  if (e) e.preventDefault();
  
  if (!currentUser) {
    showMessage('⚠️ Please log in first', 'error', 'settingsMessage');
    return;
  }
  
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const saveBtnLoader = document.getElementById('saveBtnLoader');
  
  // Show loading state
  saveBtn.disabled = true;
  saveBtnText.style.display = 'none';
  saveBtnLoader.style.display = 'block';
  
  try {
    const preferences = extractPreferencesFromForm();
    
    const response = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: currentUser.email,
        preferences: preferences
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showMessage('✅ Preferences saved successfully!', 'success', 'settingsMessage');
      localStorage.setItem('preferences', JSON.stringify(preferences));
    } else {
      showMessage('❌ Failed to save preferences', 'error', 'settingsMessage');
    }
  } catch (error) {
    console.error('Save preferences error:', error);
    showMessage('❌ Error: ' + error.message, 'error', 'settingsMessage');
  } finally {
    saveBtn.disabled = false;
    saveBtnText.style.display = 'inline';
    saveBtnLoader.style.display = 'none';
  }
}

function extractPreferencesFromForm() {
  const form = document.getElementById('preferencesForm');
  const formData = new FormData(form);
  
  // Extract work hours
  const workHours = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const checkedDays = Array.from(formData.getAll('workDays'));
  
  days.forEach(day => {
    if (checkedDays.includes(day)) {
      workHours[day] = {
        start: formData.get(`${day}-start`) || '09:00',
        end: formData.get(`${day}-end`) || '17:00'
      };
    }
  });
  
  // Extract meeting windows
  const meetingWindows = [];
  let windowIndex = 0;
  while (formData.has(`meetingWindow-${windowIndex}-start`)) {
    meetingWindows.push({
      start: formData.get(`meetingWindow-${windowIndex}-start`),
      end: formData.get(`meetingWindow-${windowIndex}-end`)
    });
    windowIndex++;
  }
  
  // Extract no-meeting zones
  const noMeetingZones = [];
  let zoneIndex = 0;
  while (formData.has(`noMeeting-${zoneIndex}-name`)) {
    noMeetingZones.push({
      name: formData.get(`noMeeting-${zoneIndex}-name`),
      start: formData.get(`noMeeting-${zoneIndex}-start`),
      end: formData.get(`noMeeting-${zoneIndex}-end`)
    });
    zoneIndex++;
  }
  
  // Extract flexibility defaults
  const flexibilityDefaults = {
    work: formData.get('flexibility-work') || 'Busy',
    personal: formData.get('flexibility-personal') || 'Flexible',
    meeting: formData.get('flexibility-meeting') || 'Rigid',
    social: formData.get('flexibility-social') || 'Busy'
  };
  
  return {
    workHours,
    bedtime: formData.get('bedtime') || '22:00',
    wakeTime: formData.get('wakeTime') || '07:00',
    meetingWindows,
    noMeetingZones,
    flexibilityDefaults
  };
}

function updateFormWithPreferences(preferences) {
  // This function updates the form based on LLM-extracted preferences
  if (preferences.workHours) {
    Object.entries(preferences.workHours).forEach(([day, hours]) => {
      const dayCheckbox = document.querySelector(`input[name="workDays"][value="${day}"]`);
      if (dayCheckbox) {
        dayCheckbox.checked = true;
        document.querySelector(`input[name="${day}-start"]`).value = hours.start;
        document.querySelector(`input[name="${day}-end"]`).value = hours.end;
      }
    });
  }
  
  if (preferences.bedtime) {
    document.querySelector('input[name="bedtime"]').value = preferences.bedtime;
  }
  
  if (preferences.wakeTime) {
    document.querySelector('input[name="wakeTime"]').value = preferences.wakeTime;
  }
  
  // Show a message
  showMessage('✨ I\'ve updated the form with your preferences!', 'success', 'settingsMessage');
}

async function loadUserPreferences() {
  if (!currentUser) return;
  
  try {
    const response = await fetch(`${API_BASE}/preferences?email=${currentUser.email}`);
    const data = await response.json();
    
    if (data.success && data.preferences) {
      localStorage.setItem('preferences', JSON.stringify(data.preferences));
      updateFormWithPreferences(data.preferences);
    }
  } catch (error) {
    console.error('Load preferences error:', error);
  }
}

function resetPreferences() {
  if (confirm('Are you sure you want to reset all preferences to defaults?')) {
    document.getElementById('preferencesForm').reset();
    showMessage('✅ Form reset to defaults', 'success', 'settingsMessage');
  }
}

// ===================================
// DYNAMIC FORM ELEMENTS
// ===================================

let meetingWindowCount = 2;
let noMeetingZoneCount = 1;

function addMeetingWindow() {
  const container = document.getElementById('meetingWindows');
  const div = document.createElement('div');
  div.className = 'meeting-window-item';
  div.innerHTML = `
    <input type="time" name="meetingWindow-${meetingWindowCount}-start" value="09:00">
    <span>to</span>
    <input type="time" name="meetingWindow-${meetingWindowCount}-end" value="10:00">
    <button type="button" class="btn-icon" onclick="removeMeetingWindow(this)">🗑️</button>
  `;
  container.appendChild(div);
  meetingWindowCount++;
}

function removeMeetingWindow(button) {
  button.closest('.meeting-window-item').remove();
}

function addNoMeetingZone() {
  const container = document.getElementById('noMeetingZones');
  const div = document.createElement('div');
  div.className = 'no-meeting-item';
  div.innerHTML = `
    <input type="text" name="noMeeting-${noMeetingZoneCount}-name" placeholder="e.g., Break Time">
    <input type="time" name="noMeeting-${noMeetingZoneCount}-start" value="12:00">
    <span>to</span>
    <input type="time" name="noMeeting-${noMeetingZoneCount}-end" value="13:00">
    <button type="button" class="btn-icon" onclick="removeNoMeetingZone(this)">🗑️</button>
  `;
  container.appendChild(div);
  noMeetingZoneCount++;
}

function removeNoMeetingZone(button) {
  button.closest('.no-meeting-item').remove();
}

// ===================================
// UTILITIES
// ===================================

function showMessage(text, type, elementId) {
  const messageEl = document.getElementById(elementId);
  if (!messageEl) return;
  
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

