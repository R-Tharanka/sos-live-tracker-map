/**
 * Firebase Fetch Interceptor
 * 
 * This utility overrides the global fetch to automatically add the SOS access token
 * to any requests made to Firestore that involve sos_sessions.
 * 
 * This is necessary because Firebase security rules require the token parameter
 * for accessing SOS session data without authentication.
 */

// Function to intercept and modify fetch requests to Firebase
function setupFirebaseTokenInterceptor() {
  // Store original fetch function
  const originalFetch = window.fetch;
  
  // Define a new fetch function that adds token to Firebase requests
  const newFetch: typeof fetch = (input, init) => {
    let modifiedInput = input;
    let url: string;
    
    // Handle Request objects and string URLs
    if (input instanceof Request) {
      url = input.url;
    } else {
      url = input.toString();
    }
    
    // Check if this is a Firebase Firestore request for sos_sessions
    if (url.includes('firestore.googleapis.com') && url.includes('sos_sessions')) {
      // Get the token from URL params first, then localStorage as backup
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || localStorage.getItem('sos_access_token');
      
      // If we have a token, add it to the request
      if (token) {
        if (input instanceof Request) {
          // For Request objects, we need to create a new Request with modified URL
          const modifiedUrl = new URL(url);
          modifiedUrl.searchParams.set('token', token);
          
          // Create new Request object with same properties but updated URL
          modifiedInput = new Request(modifiedUrl.toString(), {
            method: input.method,
            headers: input.headers,
            body: input.body,
            mode: input.mode,
            credentials: input.credentials,
            cache: input.cache,
            redirect: input.redirect,
            referrer: input.referrer,
            referrerPolicy: input.referrerPolicy,
            integrity: input.integrity,
            keepalive: input.keepalive,
            signal: input.signal,
          });
        } else {
          // For string URLs, simply add the token parameter
          const separator = url.includes('?') ? '&' : '?';
          modifiedInput = `${url}${separator}token=${encodeURIComponent(token)}`;
        }
        console.debug('Added token to Firebase request', url.substring(0, 50) + '...');
      } else {
        console.warn('No token available for SOS session request');
      }
    }
    
    // Call original fetch with possibly modified input
    return originalFetch(modifiedInput, init);
  };
  
  // Replace the global fetch
  window.fetch = newFetch;
}

// Set up the interceptor when the module is imported
setupFirebaseTokenInterceptor();

// Export an empty object as this is a side-effect module
export default {};