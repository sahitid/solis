// OAuth callback handler for Solis extension

(async function() {
  const loadingDiv = document.getElementById('loading');
  const successDiv = document.getElementById('success');
  const errorDiv = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');

  try {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userDataEncoded = urlParams.get('user');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(error === 'auth_failed' ? 'Authentication failed' : 'Unknown error');
    }

    if (!userDataEncoded) {
      throw new Error('No user data received');
    }

    // Decode user data
    const userData = JSON.parse(decodeURIComponent(userDataEncoded));
    
    console.log('✅ User authenticated:', userData.Email);

    // Send message to extension popup
    chrome.runtime.sendMessage({
      action: 'authSuccess',
      userData: userData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
      }
    });

    // Show success
    loadingDiv.style.display = 'none';
    successDiv.style.display = 'block';

    // Auto-close after 3 seconds
    setTimeout(() => {
      window.close();
    }, 3000);

  } catch (err) {
    console.error('Callback error:', err);
    loadingDiv.style.display = 'none';
    errorDiv.style.display = 'block';
    errorMessage.textContent = err.message;
  }
})();

