// Content script helper for success page
// This script is injected into the success page to enable tab closing

(function() {
  // Listen for close requests from the page
  window.addEventListener('message', function(event) {
    // Only accept messages from the same origin
    if (event.origin !== window.location.origin) return;
    
    if (event.data && event.data.action === 'requestCloseTab') {
      // Send message to extension to close the tab
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'closeTab'
        }, (response) => {
          // If extension doesn't respond, try window.close()
          if (chrome.runtime.lastError) {
            window.close();
          }
        });
      } else {
        window.close();
      }
    }
  });
  
  // Also expose a global function that the page can call
  window.solisCloseTab = function() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'closeTab'
      }, (response) => {
        if (chrome.runtime.lastError) {
          window.close();
        }
      });
    } else {
      window.close();
    }
  };
})();

