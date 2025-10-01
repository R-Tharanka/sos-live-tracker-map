/**
 * Firebase Fetch Interceptor
 * 
 * This utility overrides the global fetch to automatically add the SOS access token
 * to any requests made to Firestore that involve sos_sessions.
 * 
 * This is necessary because Firebase security rules require the token parameter
 * for accessing SOS session data without authentication.
 * 
 * Updated to fix streaming request issues and add more debugging
 */
console.log("[TokenInterceptor] Initializing improved token interceptor v2");

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
    
    // Check if this is a Firebase Firestore request
    if (url.includes('firestore.googleapis.com')) {
      // Get the token from URL params first, then localStorage as backup
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || localStorage.getItem('sos_access_token');
      
      // If we have a token, add it to all Firestore requests
      if (token) {
        try {
          // CRITICAL FIX: Don't modify streaming requests at all
          // These include Listen operations which require duplex setting
          if (url.includes('/Listen/') || url.includes('channel?')) {
            console.log("[TokenInterceptor] Skipping token injection for streaming request");
            return originalFetch(input, init);
          }
          
          // Only add token to document requests for sos_sessions collection
          if (url.includes('sos_sessions')) {
            console.log(`[TokenInterceptor] Processing sos_sessions request: ${url.substring(0, 40)}...`);
            
            // Check if the URL already contains a token parameter
            const urlObj = new URL(url);
            const hasToken = urlObj.searchParams.has('token');
            
            if (hasToken) {
              console.log('[TokenInterceptor] URL already contains token parameter, skipping modification');
              // Return the original input without modification
              return originalFetch(input, init);
            }
            
            console.log('[TokenInterceptor] Adding token to request');
            if (typeof input === 'string') {
              // For string URLs, add the token parameter
              const separator = url.includes('?') ? '&' : '?';
              modifiedInput = `${url}${separator}token=${encodeURIComponent(token)}`;
            } else if (input instanceof Request && input.method === 'GET') {
              // For GET Request objects, safely create a new Request
              const modifiedUrl = new URL(url);
              modifiedUrl.searchParams.set('token', token);
              
              // Create new Request object with same properties but updated URL
              modifiedInput = new Request(modifiedUrl.toString(), {
                method: input.method,
                headers: input.headers,
                mode: input.mode,
                credentials: input.credentials,
                cache: input.cache,
                redirect: input.redirect,
                referrer: input.referrer,
                referrerPolicy: input.referrerPolicy as ReferrerPolicy,
                integrity: input.integrity,
                keepalive: input.keepalive,
                signal: input.signal,
                // Deliberately omit body for GET requests
              });
            } else {
              // For non-GET requests with bodies, don't try to recreate the Request
              // as it could cause duplex issues
              console.log("[TokenInterceptor] Skipping non-GET request with body");
              return originalFetch(input, init);
            }
          }
        } catch (error) {
          console.error('[TokenInterceptor] Error adding token to Firebase request:', error);
          return originalFetch(input, init); // Fall back to original request on error
        }
      } else {
        console.warn('[TokenInterceptor] No token available for Firestore request');
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