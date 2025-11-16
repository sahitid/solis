// Popup script for Solis extension

const API_BASE = 'http://localhost:5000/api';

// State
let currentUser = null;
let conflictData = null;
let currentEventData = null;

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
  
  // Modal event listeners
  document.getElementById('closeModal').addEventListener('click', closeConflictModal);
  document.getElementById('acceptSlotBtn').addEventListener('click', handleAcceptSlot);
  document.getElementById('showOptionsBtn').addEventListener('click', showDecisionTree);
  document.getElementById('backToAIBtn').addEventListener('click', showAIRecommendation);
  document.getElementById('cancelOptionBtn').addEventListener('click', handleCancelEvent);
  document.getElementById('differentDayBtn').addEventListener('click', showDifferentDayOptions);
  document.getElementById('sameDayBtn').addEventListener('click', showSameDayOptions);
  document.getElementById('backFromDaysBtn').addEventListener('click', showDecisionTree);
  document.getElementById('backFromSameDayBtn').addEventListener('click', showDecisionTree);
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
    } else if (response.status === 409 && data.hasConflicts) {
      // Store event data and conflict info
      currentEventData = eventData;
      conflictData = data;
      
      // Show conflict resolution modal
      await handleConflict(eventData, data.conflicts[0]);
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

// ==================== CONFLICT RESOLUTION ====================

// Handle conflict - analyze with AI
async function handleConflict(newEventData, conflictInfo) {
  console.log('🔍 handleConflict called');
  console.log('📝 New event data:', newEventData);
  console.log('⚠️ Conflict info:', conflictInfo);
  
  // Show modal with loading
  showConflictModal();
  showModalLoading();
  
  try {
    // Call AI analysis endpoint
    console.log('🤖 Calling AI analysis endpoint...');
    const payload = {
      email: currentUser.Email,
      newEventData: newEventData,
      conflictingEventId: conflictInfo.conflictingEvent.id
    };
    console.log('📦 Payload:', payload);
    
    const response = await fetch(`${API_BASE}/reschedule-decision/analyze-conflict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('📬 Response status:', response.status);
    const data = await response.json();
    console.log('📊 Response data:', data);
    
    if (data.success) {
      hideModalLoading();
      displayAIRecommendation(data.analysis, conflictInfo);
    } else {
      throw new Error(data.error || 'Failed to analyze conflict');
    }
    
  } catch (error) {
    console.error('❌ Conflict analysis error:', error);
    hideModalLoading();
    closeConflictModal();
    showMessage('❌ Failed to analyze conflict: ' + error.message, 'error');
  }
}

// Display AI recommendation
function displayAIRecommendation(analysis, conflictInfo) {
  console.log('📊 Displaying AI recommendation with analysis:', analysis);
  
  const conflictMessage = document.getElementById('conflictMessage');
  const aiReason = document.getElementById('aiReason');
  const confidenceBadge = document.getElementById('confidenceBadge');
  const suggestedTime = document.getElementById('suggestedTime');
  const slotReason = document.getElementById('slotReason');
  const bestSlotSection = document.getElementById('bestSlotSection');
  const acceptBtn = document.getElementById('acceptSlotBtn');
  
  // Determine which event is being moved
  const isMovingNewEvent = analysis.recommendation.action === 'move_new_event';
  const eventBeingMoved = analysis.recommendation.eventToMove.name;
  const eventBeingKept = analysis.recommendation.eventToKeep.name;
  
  // Set conflict message with clear indication of what will happen
  if (isMovingNewEvent) {
    conflictMessage.textContent = `Your new event "${currentEventData.title}" conflicts with "${conflictInfo.conflictingEvent.name}". We'll move "${eventBeingMoved}" to resolve the conflict.`;
  } else {
    conflictMessage.textContent = `Your new event "${currentEventData.title}" conflicts with "${conflictInfo.conflictingEvent.name}". We'll move "${eventBeingMoved}" and keep your new event at the original time.`;
  }
  
  // Set AI analysis
  aiReason.textContent = analysis.aiPriorityComparison.reason;
  
  // Set confidence badge
  const confidence = analysis.aiPriorityComparison.confidenceLevel;
  confidenceBadge.textContent = `${confidence} confidence`;
  confidenceBadge.className = `confidence-badge confidence-${confidence}`;
  
  // Show best slot if available
  if (analysis.sameDayBestSlot) {
    console.log('✅ Found same-day slot:', analysis.sameDayBestSlot);
    const slot = analysis.sameDayBestSlot;
    const startTime = new Date(slot.startDateTime).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    const endTime = new Date(slot.endDateTime).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    
    // Make it CRYSTAL CLEAR which event is moving where
    if (isMovingNewEvent) {
      // New event is lower priority - it's being moved
      suggestedTime.textContent = `Move "${eventBeingMoved}" to ${startTime} - ${endTime}`;
      slotReason.textContent = `"${eventBeingKept}" stays at original time`;
    } else {
      // Existing event is lower priority - it's being moved
      suggestedTime.textContent = `Move "${eventBeingMoved}" to ${startTime} - ${endTime}`;
      slotReason.textContent = `Your "${currentEventData.title}" will be scheduled at your requested time`;
    }
    
    bestSlotSection.style.display = 'block';
    acceptBtn.style.display = 'inline-flex';
    
    // Update accept button text to be more descriptive
    acceptBtn.textContent = isMovingNewEvent 
      ? `Move My Event to ${startTime}`
      : `Move "${eventBeingMoved}" & Keep Mine`;
    
    // Store suggested slot
    analysis.sameDayBestSlot.formatted = { startTime, endTime };
  } else {
    console.log('⚠️ No same-day slot found, hiding suggestion');
    bestSlotSection.style.display = 'none';
    acceptBtn.style.display = 'none';
    
    // Update message to tell user to explore options
    aiReason.textContent += ' No same-day slots available. Click "Show More Options" to see alternative days.';
  }
  
  // Store analysis for later use
  conflictData.analysis = analysis;
  
  // Show AI recommendation section
  showAIRecommendation();
}

// Show conflict modal
function showConflictModal() {
  document.getElementById('conflictModal').style.display = 'flex';
}

// Close conflict modal
function closeConflictModal() {
  document.getElementById('conflictModal').style.display = 'none';
  conflictData = null;
  currentEventData = null;
}

// Show/hide modal sections
function hideAllModalSections() {
  document.getElementById('aiRecommendation').style.display = 'none';
  document.getElementById('decisionTree').style.display = 'none';
  document.getElementById('differentDayView').style.display = 'none';
  document.getElementById('sameDayView').style.display = 'none';
  document.getElementById('modalLoading').style.display = 'none';
}

function showModalLoading() {
  hideAllModalSections();
  document.getElementById('modalLoading').style.display = 'flex';
}

function hideModalLoading() {
  document.getElementById('modalLoading').style.display = 'none';
}

function showAIRecommendation() {
  hideAllModalSections();
  document.getElementById('aiRecommendation').style.display = 'block';
}

function showDecisionTree() {
  hideAllModalSections();
  document.getElementById('decisionTree').style.display = 'block';
}

// Handle accept suggested slot
async function handleAcceptSlot() {
  console.log('🔵 handleAcceptSlot called!');
  console.log('🔵 conflictData:', conflictData);
  console.log('🔵 currentEventData:', currentEventData);
  
  if (!conflictData || !conflictData.analysis || !conflictData.analysis.sameDayBestSlot) {
    console.error('❌ No slot data available');
    alert('Error: No time slot data available. Please try again.');
    showMessage('❌ No time slot selected', 'error');
    return;
  }
  
  console.log('✅ Slot data exists, showing loading...');
  showModalLoading();
  
  try {
    const slot = conflictData.analysis.sameDayBestSlot;
    const recommendation = conflictData.analysis.recommendation;
    
    console.log('📅 Suggested slot:', slot);
    console.log('🎯 Recommendation:', recommendation);
    
    // Check which event we're moving
    const movingNewEvent = recommendation.action === 'move_new_event';
    
    if (movingNewEvent) {
      // CASE 1: New event is LOWER priority - move it to suggested slot
      console.log('➡️ Moving NEW event to suggested slot');
      
      const response = await fetch(`${API_BASE}/events/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.Email,
          eventData: {
            ...currentEventData,
            startDateTime: slot.startDateTime,
            endDateTime: slot.endDateTime
          },
          skipConflictCheck: true
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        closeConflictModal();
        showMessage(`✅ Event scheduled for ${slot.formatted.startTime}!`, 'success');
        document.getElementById('eventForm').reset();
        setDefaultDates();
      } else {
        throw new Error(data.error || 'Failed to schedule event');
      }
      
    } else {
      // CASE 2: New event is HIGHER priority - move EXISTING event, schedule new event at original time
      console.log('🔥 CASE 2: Moving EXISTING event, keeping new event at original time');
      console.log('📋 Conflicting event ID:', conflictData.conflicts[0].conflictingEvent.id);
      console.log('📋 Event to move:', recommendation.eventToMove.name);
      console.log('📋 Event to keep:', recommendation.eventToKeep.name);
      console.log('📋 New time slot:', slot.startDateTime, 'to', slot.endDateTime);
      
      const conflictingEventId = conflictData.conflicts[0].conflictingEvent.id;
      
      // Step 1: Move existing event to suggested slot
      console.log('📦 Step 1: Moving existing event to new slot...');
      console.log('🔹 Calling /move-manual with:', {
        email: currentUser.Email,
        eventId: conflictingEventId,
        newTimeSlot: {
          startDateTime: slot.startDateTime,
          endDateTime: slot.endDateTime
        }
      });
      
      const moveResponse = await fetch(`${API_BASE}/reschedule-decision/move-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.Email,
          eventId: conflictingEventId,
          newTimeSlot: {
            startDateTime: slot.startDateTime,
            endDateTime: slot.endDateTime
          },
          userApproved: true
        })
      });
      
      console.log('📬 Move response status:', moveResponse.status);
      const moveData = await moveResponse.json();
      console.log('📊 Move response data:', moveData);
      
      if (!moveResponse.ok || !moveData.success) {
        console.error('❌ Failed to move existing event:', moveData);
        throw new Error(moveData.error || 'Failed to move existing event');
      }
      
      console.log('✅ Existing event moved successfully to', slot.startDateTime);
      
      // Step 2: Schedule new event at its ORIGINAL time
      console.log('📦 Step 2: Scheduling new event at ORIGINAL time...');
      console.log('🔹 Original event data:', currentEventData);
      
      const createResponse = await fetch(`${API_BASE}/events/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.Email,
          eventData: currentEventData, // Use original time
          skipConflictCheck: true
        })
      });
      
      console.log('📬 Create response status:', createResponse.status);
      const createData = await createResponse.json();
      console.log('📊 Create response data:', createData);
      
      if (createResponse.ok && createData.success) {
        console.log('✅✅ SUCCESS! Both operations completed');
        // Save the event title before closing modal (which clears currentEventData)
        const newEventTitle = currentEventData.title;
        const successMsg = `✅ "${recommendation.eventToMove.name}" moved to ${slot.formatted.startTime}, your "${newEventTitle}" scheduled at original time!`;
        closeConflictModal();
        showMessage(successMsg, 'success');
        document.getElementById('eventForm').reset();
        setDefaultDates();
      } else {
        console.error('❌ Failed to create new event:', createData);
        throw new Error(createData.error || 'Failed to schedule new event');
      }
    }
    
  } catch (error) {
    console.error('❌ Schedule error:', error);
    alert(`Error scheduling event: ${error.message}`);
    hideModalLoading();
    showMessage('❌ ' + error.message, 'error');
  }
}

// Show different day options
async function showDifferentDayOptions() {
  showModalLoading();
  
  try {
    // For new events, we need to get the first conflicting event ID
    const conflictingEventId = conflictData.conflicts[0].conflictingEvent.id;
    
    const response = await fetch(`${API_BASE}/reschedule-decision/get-broad-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.Email,
        eventId: conflictingEventId
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.options.differentDay.bestDays) {
      displayBestDays(data.options.differentDay.bestDays);
      hideModalLoading();
      hideAllModalSections();
      document.getElementById('differentDayView').style.display = 'block';
    } else {
      throw new Error('No alternative days found');
    }
    
  } catch (error) {
    console.error('Get days error:', error);
    hideModalLoading();
    showMessage('❌ ' + error.message, 'error');
  }
}

// Display best days
function displayBestDays(bestDays) {
  const listEl = document.getElementById('bestDaysList');
  listEl.innerHTML = '';
  
  bestDays.forEach(day => {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-option';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'day-header';
    
    const dayName = document.createElement('div');
    dayName.className = 'day-name';
    dayName.textContent = `${day.dayOfWeek}, ${new Date(day.date).toLocaleDateString()}`;
    
    const slotCount = document.createElement('div');
    slotCount.className = 'slot-count';
    slotCount.textContent = `${day.availableSlots.length} slots`;
    
    headerDiv.appendChild(dayName);
    headerDiv.appendChild(slotCount);
    
    const slotsDiv = document.createElement('div');
    slotsDiv.className = 'time-slots';
    slotsDiv.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;';
    
    // Show top 3 available slots for this day (sorted by score, best first)
    day.availableSlots.slice(0, 3).forEach(slot => {
      const chip = document.createElement('button');
      chip.className = 'time-chip';
      chip.style.cssText = 'padding: 8px 12px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s;';
      chip.textContent = `${slot.startTime} - ${slot.endTime}`;
      chip.title = `Click to schedule at ${slot.startTime} - ${slot.endTime}`;
      
      // Add hover effect
      chip.onmouseenter = () => {
        chip.style.background = '#45a049';
        chip.style.transform = 'scale(1.05)';
      };
      chip.onmouseleave = () => {
        chip.style.background = '#4CAF50';
        chip.style.transform = 'scale(1)';
      };
      
      chip.onclick = () => {
        console.log('Selected time slot:', slot);
        scheduleAtTime(slot);
      };
      
      slotsDiv.appendChild(chip);
    });
    
    // Add a note if there are many slots
    if (day.availableSlots.length === 0) {
      const noSlotsMsg = document.createElement('div');
      noSlotsMsg.style.cssText = 'color: #999; font-size: 12px; font-style: italic; margin-top: 8px;';
      noSlotsMsg.textContent = 'No available slots found for this day';
      slotsDiv.appendChild(noSlotsMsg);
    }
    
    dayDiv.appendChild(headerDiv);
    dayDiv.appendChild(slotsDiv);
    listEl.appendChild(dayDiv);
  });
}

// Show same day options
async function showSameDayOptions() {
  showModalLoading();
  
  try {
    const conflictingEventId = conflictData.conflicts[0].conflictingEvent.id;
    
    const response = await fetch(`${API_BASE}/reschedule-decision/get-broad-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.Email,
        eventId: conflictingEventId
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.options.sameDay.availableSlots) {
      displaySameDaySlots(data.options.sameDay.availableSlots);
      hideModalLoading();
      hideAllModalSections();
      document.getElementById('sameDayView').style.display = 'block';
    } else {
      throw new Error('No same-day slots found');
    }
    
  } catch (error) {
    console.error('Get slots error:', error);
    hideModalLoading();
    showMessage('❌ ' + error.message, 'error');
  }
}

// Display same day slots
function displaySameDaySlots(slots) {
  const listEl = document.getElementById('sameDaySlotsList');
  listEl.innerHTML = '';
  
  slots.forEach(slot => {
    const slotDiv = document.createElement('div');
    slotDiv.className = 'slot-card';
    slotDiv.style.marginBottom = '10px';
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'slot-time';
    timeDiv.textContent = `${slot.startTime} - ${slot.endTime}`;
    
    const reasonDiv = document.createElement('div');
    reasonDiv.className = 'slot-reason';
    reasonDiv.textContent = slot.reason || 'Available';
    
    slotDiv.appendChild(timeDiv);
    slotDiv.appendChild(reasonDiv);
    slotDiv.onclick = () => scheduleAtTime(slot);
    
    listEl.appendChild(slotDiv);
  });
}

// Schedule at specific time
async function scheduleAtTime(slot) {
  showModalLoading();
  
  try {
    console.log('Scheduling at slot:', slot);
    
    const response = await fetch(`${API_BASE}/events/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.Email,
        eventData: {
          ...currentEventData,
          startDateTime: slot.startDateTime,
          endDateTime: slot.endDateTime
        },
        skipConflictCheck: true // Skip check since this is a suggested available slot
      })
    });
    
    const data = await response.json();
    
    console.log('Response:', response.status, data);
    
    if (response.ok && data.success) {
      closeConflictModal();
      showMessage(`✅ Event scheduled for ${slot.startTime}!`, 'success');
      document.getElementById('eventForm').reset();
      setDefaultDates();
    } else if (response.status === 409) {
      hideModalLoading();
      showMessage('⚠️ This time also has a conflict. Try another option.', 'warning');
    } else {
      throw new Error(data.error || 'Failed to schedule event');
    }
    
  } catch (error) {
    console.error('Schedule error:', error);
    hideModalLoading();
    showMessage('❌ ' + error.message, 'error');
  }
}

// Handle cancel event
async function handleCancelEvent() {
  if (!confirm('Are you sure you want to cancel this event?')) {
    return;
  }
  
  closeConflictModal();
  showMessage('✅ Event not scheduled', 'success');
  document.getElementById('eventForm').reset();
  setDefaultDates();
}

