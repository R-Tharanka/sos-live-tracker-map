// This script adds a token parameter to Firebase REST API calls
// This is needed for SOS session access without authentication

// Function to intercept and modify fetch requests to Firebase
function setupFirebaseTokenInterceptor() {
  // Store original fetch function
  const originalFetch = window.fetch;
  
  // Define a new fetch function that adds token to Firebase requests
  const newFetch: typeof fetch = (input, init) => {
    let modifiedInput = input;
    
    // Only process if it's a string URL
    if (typeof input === 'string') {
      // Check if this is a Firebase Firestore request
      if (input.includes('firestore.googleapis.com') && 
          input.includes('sos_sessions')) {
        
        // Get the token from localStorage or URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || localStorage.getItem('sos_access_token');
        
        // If we have a token, add it to the URL
        if (token) {
          // Add the token parameter to the URL
          const separator = input.includes('?') ? '&' : '?';
          modifiedInput = `${input}${separator}token=${encodeURIComponent(token)}`;
          console.log('Added token to Firebase request');
        }
      }
    }
    
    // Call original fetch with possibly modified URL
    return originalFetch(modifiedInput, init);
  };
  
  // Replace the global fetch
  window.fetch = newFetch;
}

// Set up the interceptor when the module is imported
setupFirebaseTokenInterceptor();

// Export an empty object as this is a side-effect module
export default {};