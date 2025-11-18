// Popup script for Solis extension

const API_BASE = 'http://localhost:5000/api';

// State
let currentUser = null;
let conflictData = null;
let currentEventData = null;
let conflictQueue = []; // Queue of conflicts to resolve one at a time
let resolvedConflicts = []; // Conflicts that have been resolved
let currentConflictIndex = 0; // Index of current conflict being resolved

// ==================== TIME RESTRICTIONS ====================
// HARDCODED: No rescheduling allowed before 6 AM or after 10 PM
const MIN_HOUR = 6;  // 6 AM
const MAX_HOUR = 22; // 10 PM (22:00)

// Check if a time slot is within allowed hours (6 AM - 10 PM)
function isTimeSlotAllowed(startDateTime, endDateTime) {
  try {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    
    const startHour = start.getHours();
    const endHour = end.getHours();
    
    // Check if start time is before 6 AM or after 10 PM
    if (startHour < MIN_HOUR || startHour >= MAX_HOUR) {
      return false;
    }
    
    // Check if end time is before 6 AM or after 10 PM
    if (endHour < MIN_HOUR || endHour >= MAX_HOUR) {
      return false;
    }
    
    // Additional check: if start is at 10 PM, it's not allowed (10 PM = 22:00, which is >= MAX_HOUR)
    // We want to allow up to but not including 10 PM
    if (startHour === MAX_HOUR) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking time slot:', error);
    return false; // Fail safe: reject if we can't parse the time
  }
}

// Validate and reject time slot with error message
function validateTimeSlot(startDateTime, endDateTime) {
  if (!isTimeSlotAllowed(startDateTime, endDateTime)) {
    const start = new Date(startDateTime);
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const timeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
    
    throw new Error(`Rescheduling is not allowed before 6 AM or after 10 PM. Selected time: ${timeStr}`);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Show login screen immediately for faster popup opening
  showLoginScreen();
  setupEventListeners();
  setDefaultDates();
  
  // Check auth in background (non-blocking)
  checkAuth();
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
      // Run in background, don't block UI
      checkForPendingAuth().catch(err => {
        console.error('Error checking pending auth:', err);
      });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    // Keep login screen visible on error
  }
}

// Check for pending auth from OAuth success page
async function checkForPendingAuth() {
  try {
    // Query the success page tab if it exists (with timeout to avoid blocking)
    let tabs = [];
    try {
      tabs = await Promise.race([
        chrome.tabs.query({ url: 'http://localhost:5000/api/auth/success*' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
      ]);
    } catch (err) {
      // Timeout or error - just continue with empty tabs array
      return;
    }
    
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
        
        // Close the success tab (don't await to avoid blocking)
        chrome.tabs.remove(tabs[0].id).catch(() => {});
      }
    }
  } catch (error) {
    // Silently fail - this is a background check, don't disrupt UX
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
      
      // Show conflict resolution modal - handle ALL conflicts
      await handleMultipleConflicts(eventData, data.conflicts);
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
  // Format date as YYYY-MM-DD using local time (not UTC) to avoid timezone issues
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
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

// Handle multiple conflicts - process one at a time
async function handleMultipleConflicts(newEventData, conflicts) {
  console.log('🔍 handleMultipleConflicts called');
  console.log('📝 New event data:', newEventData);
  console.log('⚠️ Number of conflicts:', conflicts.length);
  console.log('⚠️ All conflicts:', conflicts);
  
  // Initialize conflict queue - process conflicts one at a time
  conflictQueue = conflicts.map((conflict, index) => ({
    ...conflict,
    index: index,
    resolved: false
  }));
  resolvedConflicts = [];
  currentConflictIndex = 0;
  
  // Start resolving the first conflict
  await resolveNextConflict(newEventData);
}

// Resolve the next conflict in the queue
async function resolveNextConflict(newEventData) {
  // Check if we've resolved all conflicts
  if (currentConflictIndex >= conflictQueue.length) {
    // All conflicts resolved - create the new event
    console.log('✅ All conflicts resolved, creating new event...');
    await createNewEventAfterConflictsResolved(newEventData);
    return;
  }
  
  const currentConflict = conflictQueue[currentConflictIndex];
  console.log(`📋 Resolving conflict ${currentConflictIndex + 1} of ${conflictQueue.length}: ${currentConflict.conflictingEvent.name}`);
  
  // Show modal with loading
  showConflictModal();
  showModalLoading();
  
  try {
    // Analyze this single conflict
    const payload = {
      email: currentUser.Email,
      newEventData: newEventData,
      conflictingEventId: currentConflict.conflictingEvent.id
    };
    
    const response = await fetch(`${API_BASE}/reschedule-decision/analyze-conflict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store conflict data for this single conflict
      conflictData = {
        conflicts: [currentConflict],
        analysis: data.analysis,
        conflictIndex: currentConflictIndex,
        totalConflicts: conflictQueue.length
      };
      
      hideModalLoading();
      displaySingleConflictRecommendation(data.analysis, currentConflict);
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

// Create new event after all conflicts are resolved
async function createNewEventAfterConflictsResolved(newEventData) {
  showModalLoading();
  
  try {
    const response = await fetch(`${API_BASE}/events/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.Email,
        eventData: newEventData,
        skipConflictCheck: true // Skip check since we've already resolved all conflicts
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      closeConflictModal();
      const resolvedCount = resolvedConflicts.length;
      showMessage(`✅ Event "${newEventData.title}" added to calendar! ${resolvedCount > 0 ? `${resolvedCount} conflicting event${resolvedCount > 1 ? 's' : ''} ${resolvedCount > 1 ? 'were' : 'was'} rescheduled.` : ''}`, 'success');
      document.getElementById('eventForm').reset();
      setDefaultDates();
    } else {
      throw new Error(data.error || 'Failed to create event');
    }
  } catch (error) {
    console.error('❌ Event creation error:', error);
    hideModalLoading();
    closeConflictModal();
    showMessage('❌ Failed to create event: ' + error.message, 'error');
  }
}

// Legacy function for single conflict (kept for backward compatibility)
async function handleConflict(newEventData, conflictInfo) {
  return handleMultipleConflicts(newEventData, [conflictInfo]);
}

// Display AI recommendation for a single conflict (with progress indicator)
function displaySingleConflictRecommendation(analysis, conflictInfo) {
  console.log('📊 Displaying AI recommendation for single conflict:', analysis);
  
  const conflictMessage = document.getElementById('conflictMessage');
  const aiReason = document.getElementById('aiReason');
  const confidenceBadge = document.getElementById('confidenceBadge');
  const suggestedTime = document.getElementById('suggestedTime');
  const slotReason = document.getElementById('slotReason');
  const bestSlotSection = document.getElementById('bestSlotSection');
  const acceptBtn = document.getElementById('acceptSlotBtn');
  
  // Show progress indicator if multiple conflicts
  const totalConflicts = conflictData?.totalConflicts || 1;
  const currentIndex = conflictData?.conflictIndex || 0;
  const progressText = totalConflicts > 1 
    ? `(Resolving conflict ${currentIndex + 1} of ${totalConflicts})`
    : '';
  
  // Determine which event is being moved
  const isMovingNewEvent = analysis.recommendation.action === 'move_new_event';
  const eventBeingMoved = analysis.recommendation.eventToMove.name;
  const eventBeingKept = analysis.recommendation.eventToKeep.name;
  
  // Set conflict message with progress indicator
  if (isMovingNewEvent) {
    conflictMessage.innerHTML = `Your new event "<strong>${currentEventData.title}</strong>" conflicts with "<strong>${conflictInfo.conflictingEvent.name}</strong>". ${progressText}<br><br>We'll move "${eventBeingMoved}" to resolve this conflict.`;
  } else {
    conflictMessage.innerHTML = `Your new event "<strong>${currentEventData.title}</strong>" conflicts with "<strong>${conflictInfo.conflictingEvent.name}</strong>". ${progressText}<br><br>We'll move "${eventBeingMoved}" and keep your new event at the original time.`;
  }
  
  // Continue with the rest of the display logic
  displayAIRecommendationCommon(analysis, [conflictInfo]);
}

// Display AI recommendation (single conflict - legacy)
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
  
  // Continue with common display logic
  displayAIRecommendationCommon(analysis, [conflictInfo]);
}

// Common display logic for AI recommendations
function displayAIRecommendationCommon(analysis, conflicts) {
  const aiReason = document.getElementById('aiReason');
  const confidenceBadge = document.getElementById('confidenceBadge');
  const suggestedTime = document.getElementById('suggestedTime');
  const slotReason = document.getElementById('slotReason');
  const bestSlotSection = document.getElementById('bestSlotSection');
  const acceptBtn = document.getElementById('acceptSlotBtn');
  
  // Determine which event is being moved (for single conflict compatibility)
  const isMovingNewEvent = analysis.recommendation?.action === 'move_new_event';
  const eventBeingMoved = analysis.recommendation?.eventToMove?.name || (analysis.eventsToMove?.[0]?.name);
  const eventBeingKept = analysis.recommendation?.eventToKeep?.name || currentEventData.title;
  
  // Set AI analysis
  aiReason.textContent = analysis.aiPriorityComparison?.reason || 'Analyzing conflicts...';
  
  // Set confidence badge
  const confidence = analysis.aiPriorityComparison?.confidenceLevel || 'medium';
  confidenceBadge.textContent = `${confidence} confidence`;
  confidenceBadge.className = `confidence-badge confidence-${confidence}`;
  
  // Show best slot if available AND within allowed hours (6 AM - 10 PM)
  if (analysis.sameDayBestSlot) {
    console.log('✅ Found same-day slot:', analysis.sameDayBestSlot);
    const slot = analysis.sameDayBestSlot;
    
    // HARDCODED RESTRICTION: Check if slot is within 6 AM - 10 PM
    if (!isTimeSlotAllowed(slot.startDateTime, slot.endDateTime)) {
      console.log('⚠️ Suggested slot is outside allowed hours (6 AM - 10 PM), hiding suggestion');
      bestSlotSection.style.display = 'none';
      acceptBtn.style.display = 'none';
      aiReason.textContent += ' No same-day slots available within allowed hours (6 AM - 10 PM). Click "Show More Options" to see alternative days.';
    } else {
      const startTime = new Date(slot.startDateTime).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
      const endTime = new Date(slot.endDateTime).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
      
      // Make it CRYSTAL CLEAR which event is moving where
      if (conflicts.length > 1) {
        // Multiple conflicts - show which events will be moved
        const eventsToMoveNames = (analysis.eventsToMove || []).map(e => e.name).join(', ');
        suggestedTime.textContent = `Reschedule ${eventsToMoveNames} to ${startTime} - ${endTime}`;
        slotReason.textContent = `Your "${currentEventData.title}" will be scheduled at your requested time`;
      } else if (isMovingNewEvent) {
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
      if (conflicts.length > 1) {
        acceptBtn.textContent = `Reschedule ${conflicts.length} Events & Keep Mine`;
      } else {
        acceptBtn.textContent = isMovingNewEvent 
          ? `Move My Event to ${startTime}`
          : `Move "${eventBeingMoved}" & Keep Mine`;
      }
      
      // Store suggested slot
      analysis.sameDayBestSlot.formatted = { startTime, endTime };
    }
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
  conflictQueue = [];
  resolvedConflicts = [];
  currentConflictIndex = 0;
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
  const decisionTreeEl = document.getElementById('decisionTree');
  decisionTreeEl.style.display = 'block';
  
  // Show progress indicator and current conflict
  const totalConflicts = conflictData?.totalConflicts || 1;
  const currentIndex = conflictData?.conflictIndex || 0;
  const currentConflict = conflictData?.conflicts?.[0];
  
  // Remove existing info
  const existingInfo = decisionTreeEl.querySelector('.conflict-info-box');
  if (existingInfo) {
    existingInfo.remove();
  }
  
  if (totalConflicts > 1 && currentConflict) {
    // Show progress and current conflict
    const infoBox = document.createElement('div');
    infoBox.className = 'conflict-info-box';
    infoBox.style.cssText = 'background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 16px;';
    infoBox.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; color: #333;">
        Resolving conflict ${currentIndex + 1} of ${totalConflicts}
      </div>
      <div style="color: #666; font-size: 14px;">
        Current conflict: <strong>${currentConflict.conflictingEvent.name}</strong>
      </div>
      ${totalConflicts > 1 ? `
        <div style="color: #999; font-size: 12px; margin-top: 8px; font-style: italic;">
          After resolving this event, you'll be prompted to resolve the next conflict.
        </div>
      ` : ''}
    `;
    
    // Insert before the decision options
    const decisionOptions = decisionTreeEl.querySelector('.decision-options');
    decisionTreeEl.insertBefore(infoBox, decisionOptions);
  }
}

// Handle accept suggested slot - resolves current conflict and moves to next
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
    const currentConflict = conflictData.conflicts[0];
    
    // HARDCODED RESTRICTION: Validate time slot is within 6 AM - 10 PM
    validateTimeSlot(slot.startDateTime, slot.endDateTime);
    
    console.log('📅 Suggested slot:', slot);
    console.log('🎯 Recommendation:', recommendation);
    
    // Check which event we're moving
    const movingNewEvent = recommendation.action === 'move_new_event';
    
    if (movingNewEvent) {
      // CASE 1: New event is LOWER priority - move it to suggested slot
      // This means we should cancel creating the new event, or the user needs to choose a different time
      console.log('➡️ New event would be moved - this case should not happen in sequential resolution');
      throw new Error('Cannot move new event in sequential conflict resolution');
      
    } else {
      // CASE 2: Conflicting event is LOWER priority - move it to suggested slot
      console.log(`🔥 Moving conflicting event "${currentConflict.conflictingEvent.name}" to suggested slot`);
      
      const conflictingEventId = currentConflict.conflictingEvent.id;
      const eventToMoveHasAttendees = !!(currentConflict.conflictingEvent.attendees && currentConflict.conflictingEvent.attendees.length > 0);
      
      // Move the conflicting event to the new time slot
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
          userApproved: true,
          updateTitleToTentative: eventToMoveHasAttendees
        })
      });
      
      const moveData = await moveResponse.json();
      if (!moveResponse.ok || !moveData.success) {
        throw new Error(moveData.error || `Failed to move "${currentConflict.conflictingEvent.name}"`);
      }
      
      // Send proposal email if event has attendees
      if (eventToMoveHasAttendees) {
        console.log(`📧 Sending reschedule proposal email for: ${currentConflict.conflictingEvent.name}`);
        const proposeResponse = await fetch(`${API_BASE}/reschedule/propose-multi-attendee`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser.Email,
            eventId: conflictingEventId,
            newTimeSlot: {
              startDateTime: slot.startDateTime,
              endDateTime: slot.endDateTime
            },
            reason: 'Conflict with new event - proposing new time'
          })
        });
        const proposeData = await proposeResponse.json();
        if (!proposeResponse.ok || !proposeData.success) {
          console.warn(`⚠️ Failed to send proposal email:`, proposeData.error);
        }
      }
      
      // Mark this conflict as resolved
      resolvedConflicts.push({
        conflict: currentConflict,
        action: 'moved',
        newTime: slot.formatted?.startTime || new Date(slot.startDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      });
      
      // Move to next conflict
      currentConflictIndex++;
      console.log(`✅ Conflict resolved. Moving to next conflict (${currentConflictIndex + 1} of ${conflictQueue.length})...`);
      
      // Resolve next conflict
      await resolveNextConflict(currentEventData);
    }
    
  } catch (error) {
    console.error('❌ Schedule error:', error);
    hideModalLoading();
    showMessage('❌ ' + error.message, 'error');
  }
}

// Show different day options - for current conflict only
async function showDifferentDayOptions() {
  console.log('📅 showDifferentDayOptions called');
  console.log('📅 conflictData:', conflictData);
  console.log('📅 currentUser:', currentUser);
  
  showModalLoading();
  
  try {
    // Get current conflict (only one at a time)
    const currentConflict = conflictData?.conflicts?.[0];
    if (!currentConflict) {
      console.error('❌ No current conflict found');
      throw new Error('No conflict to resolve');
    }
    
    if (!currentUser || !currentUser.Email) {
      console.error('❌ No user email found');
      throw new Error('User not authenticated');
    }
    
    const conflictingEventId = currentConflict.conflictingEvent.id;
    console.log(`📅 Getting different day options for: ${currentConflict.conflictingEvent.name} (ID: ${conflictingEventId})`);
    
    const response = await fetch(`${API_BASE}/reschedule-decision/get-broad-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.Email,
        eventId: conflictingEventId
      })
    });
    
    console.log('📅 Response status:', response.status);
    const data = await response.json();
    console.log('📅 Response data:', data);
    
    if (data.success && data.options && data.options.differentDay && data.options.differentDay.bestDays) {
      displayBestDays(data.options.differentDay.bestDays, [currentConflict]);
      hideModalLoading();
      hideAllModalSections();
      document.getElementById('differentDayView').style.display = 'block';
    } else {
      console.error('❌ No alternative days in response:', data);
      throw new Error(data.error || 'No alternative days found');
    }
    
  } catch (error) {
    console.error('❌ Get days error:', error);
    hideModalLoading();
    showMessage('❌ ' + error.message, 'error');
    // Show decision tree again so user can try other options
    showDecisionTree();
  }
}

// Display best days
function displayBestDays(bestDays, conflicts = []) {
  const listEl = document.getElementById('bestDaysList');
  listEl.innerHTML = '';
  
  // Show current conflict being resolved
  const currentConflict = conflicts[0] || conflictData?.conflicts?.[0];
  const totalConflicts = conflictData?.totalConflicts || 1;
  const currentIndex = conflictData?.conflictIndex || 0;
  
  if (currentConflict && totalConflicts > 1) {
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 16px;';
    headerDiv.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; color: #333;">
        Resolving conflict ${currentIndex + 1} of ${totalConflicts}
      </div>
      <div style="color: #666; font-size: 14px;">
        Rescheduling: <strong>${currentConflict.conflictingEvent.name}</strong>
      </div>
    `;
    listEl.appendChild(headerDiv);
  }
  
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
    // HARDCODED RESTRICTION: Filter out slots outside 6 AM - 10 PM
    const allowedSlots = day.availableSlots.filter(slot => {
      // Check if slot has startDateTime and endDateTime
      if (slot.startDateTime && slot.endDateTime) {
        return isTimeSlotAllowed(slot.startDateTime, slot.endDateTime);
      }
      // If slot only has startTime/endTime strings, parse them
      if (slot.startTime && slot.date) {
        try {
          const [hours, minutes] = slot.startTime.split(':').map(Number);
          const startDate = new Date(slot.date);
          startDate.setHours(hours, minutes, 0, 0);
          const endDate = new Date(startDate);
          const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
          endDate.setHours(endHours, endMinutes, 0, 0);
          return isTimeSlotAllowed(startDate, endDate);
        } catch (e) {
          return false;
        }
      }
      return false;
    });
    
    allowedSlots.slice(0, 3).forEach(slot => {
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

// Show same day options - for current conflict only
async function showSameDayOptions() {
  console.log('🕐 showSameDayOptions called');
  console.log('🕐 conflictData:', conflictData);
  console.log('🕐 currentUser:', currentUser);
  
  showModalLoading();
  
  try {
    // Get current conflict (only one at a time)
    const currentConflict = conflictData?.conflicts?.[0];
    if (!currentConflict) {
      console.error('❌ No current conflict found');
      throw new Error('No conflict to resolve');
    }
    
    if (!currentUser || !currentUser.Email) {
      console.error('❌ No user email found');
      throw new Error('User not authenticated');
    }
    
    const conflictingEventId = currentConflict.conflictingEvent.id;
    console.log(`🕐 Getting same day options for: ${currentConflict.conflictingEvent.name} (ID: ${conflictingEventId})`);
    
    const response = await fetch(`${API_BASE}/reschedule-decision/get-broad-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.Email,
        eventId: conflictingEventId
      })
    });
    
    console.log('🕐 Response status:', response.status);
    const data = await response.json();
    console.log('🕐 Response data:', data);
    
    if (data.success && data.options && data.options.sameDay && data.options.sameDay.availableSlots) {
      displaySameDaySlots(data.options.sameDay.availableSlots, [currentConflict]);
      hideModalLoading();
      hideAllModalSections();
      document.getElementById('sameDayView').style.display = 'block';
    } else {
      console.error('❌ No same-day slots in response:', data);
      throw new Error(data.error || 'No same-day slots found');
    }
    
  } catch (error) {
    console.error('❌ Get slots error:', error);
    hideModalLoading();
    showMessage('❌ ' + error.message, 'error');
    // Show decision tree again so user can try other options
    showDecisionTree();
  }
}

// Display same day slots
function displaySameDaySlots(slots, conflicts = []) {
  const listEl = document.getElementById('sameDaySlotsList');
  listEl.innerHTML = '';
  
  // Show current conflict being resolved
  const currentConflict = conflicts[0] || conflictData?.conflicts?.[0];
  const totalConflicts = conflictData?.totalConflicts || 1;
  const currentIndex = conflictData?.conflictIndex || 0;
  
  if (currentConflict && totalConflicts > 1) {
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 16px;';
    headerDiv.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; color: #333;">
        Resolving conflict ${currentIndex + 1} of ${totalConflicts}
      </div>
      <div style="color: #666; font-size: 14px;">
        Rescheduling: <strong>${currentConflict.conflictingEvent.name}</strong>
      </div>
    `;
    listEl.appendChild(headerDiv);
  }
  
  // HARDCODED RESTRICTION: Filter out slots outside 6 AM - 10 PM
  const allowedSlots = slots.filter(slot => {
    // Check if slot has startDateTime and endDateTime
    if (slot.startDateTime && slot.endDateTime) {
      return isTimeSlotAllowed(slot.startDateTime, slot.endDateTime);
    }
    // If slot only has startTime/endTime strings, parse them
    if (slot.startTime && slot.date) {
      try {
        const [hours, minutes] = slot.startTime.split(':').map(Number);
        const startDate = new Date(slot.date);
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDate);
        const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
        endDate.setHours(endHours, endMinutes, 0, 0);
        return isTimeSlotAllowed(startDate, endDate);
      } catch (e) {
        return false;
      }
    }
    return false;
  });
  
  if (allowedSlots.length === 0) {
    const noSlotsMsg = document.createElement('div');
    noSlotsMsg.style.cssText = 'color: #999; font-size: 12px; font-style: italic; padding: 20px; text-align: center;';
    noSlotsMsg.textContent = 'No available slots found within allowed hours (6 AM - 10 PM)';
    listEl.appendChild(noSlotsMsg);
    return;
  }
  
  allowedSlots.forEach(slot => {
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
    slotDiv.onclick = () => {
      scheduleAtTime(slot);
    };
    
    listEl.appendChild(slotDiv);
  });
}

// Schedule at specific time
async function scheduleAtTime(slot) {
  showModalLoading();
  
  try {
    console.log('Scheduling at slot:', slot);
    console.log('Conflict data:', conflictData);
    
    // HARDCODED RESTRICTION: Validate time slot is within 6 AM - 10 PM
    // Get the actual datetime values from the slot
    let startDateTime, endDateTime;
    if (slot.startDateTime && slot.endDateTime) {
      startDateTime = slot.startDateTime;
      endDateTime = slot.endDateTime;
    } else if (slot.startTime && slot.date) {
      // Parse from time strings and date
      const [hours, minutes] = slot.startTime.split(':').map(Number);
      const startDate = new Date(slot.date);
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate);
      const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
      endDate.setHours(endHours, endMinutes, 0, 0);
      startDateTime = startDate.toISOString();
      endDateTime = endDate.toISOString();
    } else {
      throw new Error('Invalid slot data: missing start/end times');
    }
    
    validateTimeSlot(startDateTime, endDateTime);
    
    // Get current conflict (only one at a time)
    const currentConflict = conflictData?.conflicts?.[0];
    if (!currentConflict) {
      throw new Error('No conflict to resolve');
    }
    
    const conflictingEventId = currentConflict.conflictingEvent.id;
    const eventToMoveHasAttendees = !!(currentConflict.conflictingEvent.attendees && currentConflict.conflictingEvent.attendees.length > 0);
    
    // Check which event should be moved based on AI recommendation
    const recommendation = conflictData?.analysis?.recommendation;
    const movingNewEvent = recommendation?.action === 'move_new_event';
    
    if (movingNewEvent) {
      // CASE 1: New event is LOWER priority - move it to the selected slot
      console.log('➡️ Moving NEW event to selected slot');
      
      // Use the validated datetime values (already computed and validated above)
      console.log('📅 Using validated slot dates:', { startDateTime, endDateTime, slotDate: slot.date });
      
      const response = await fetch(`${API_BASE}/events/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.Email,
          eventData: {
            ...currentEventData,
            startDateTime: startDateTime,
            endDateTime: endDateTime
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
    } else {
      // CASE 2: Conflicting event is LOWER priority - move it to selected slot
      console.log(`➡️ Moving conflicting event "${currentConflict.conflictingEvent.name}" to selected slot`);
      
      // Move the conflicting event to the new time slot
      const moveResponse = await fetch(`${API_BASE}/reschedule-decision/move-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.Email,
          eventId: conflictingEventId,
          newTimeSlot: {
            startDateTime: startDateTime,
            endDateTime: endDateTime
          },
          userApproved: true,
          updateTitleToTentative: eventToMoveHasAttendees
        })
      });
      
      const moveData = await moveResponse.json();
      if (!moveResponse.ok || !moveData.success) {
        throw new Error(moveData.error || `Failed to move "${currentConflict.conflictingEvent.name}"`);
      }
      
      // Send proposal email if event has attendees
      if (eventToMoveHasAttendees) {
        console.log(`📧 Sending reschedule proposal email for: ${currentConflict.conflictingEvent.name}`);
        const proposeResponse = await fetch(`${API_BASE}/reschedule/propose-multi-attendee`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser.Email,
            eventId: conflictingEventId,
            newTimeSlot: {
              startDateTime: startDateTime,
              endDateTime: endDateTime
            },
            reason: 'Conflict with new event - proposing new time'
          })
        });
        const proposeData = await proposeResponse.json();
        if (!proposeResponse.ok || !proposeData.success) {
          console.warn(`⚠️ Failed to send proposal email:`, proposeData.error);
        }
      }
      
      // Mark this conflict as resolved
      const timeStr = slot.startTime || new Date(startDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      resolvedConflicts.push({
        conflict: currentConflict,
        action: 'moved',
        newTime: timeStr
      });
      
      // Move to next conflict
      currentConflictIndex++;
      console.log(`✅ Conflict resolved. Moving to next conflict (${currentConflictIndex + 1} of ${conflictQueue.length})...`);
      
      // Resolve next conflict
      await resolveNextConflict(currentEventData);
    }
    
  } catch (error) {
    console.error('Schedule error:', error);
    hideModalLoading();
    showMessage('❌ ' + error.message, 'error');
  }
}

// Handle cancel event - cancels current conflicting event and moves to next
async function handleCancelEvent() {
  const currentConflict = conflictData?.conflicts?.[0];
  const eventName = currentConflict?.conflictingEvent?.name || 'this event';
  
  if (!confirm(`Are you sure you want to cancel "${eventName}"?`)) {
    return;
  }
  
  showModalLoading();
  
  try {
    // Delete the conflicting event
    const conflictingEventId = currentConflict.conflictingEvent.id;
    const deleteResponse = await fetch(`${API_BASE}/events/${conflictingEventId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.Email
      })
    });
    
    const deleteData = await deleteResponse.json();
    if (!deleteResponse.ok || !deleteData.success) {
      throw new Error(deleteData.error || 'Failed to cancel event');
    }
    
    // Mark this conflict as resolved
    resolvedConflicts.push({
      conflict: currentConflict,
      action: 'cancelled'
    });
    
    // Move to next conflict
    currentConflictIndex++;
    console.log(`✅ Conflict cancelled. Moving to next conflict (${currentConflictIndex + 1} of ${conflictQueue.length})...`);
    
    // Resolve next conflict
    await resolveNextConflict(currentEventData);
    
  } catch (error) {
    console.error('❌ Cancel error:', error);
    hideModalLoading();
    showMessage('❌ Failed to cancel event: ' + error.message, 'error');
  }
}

