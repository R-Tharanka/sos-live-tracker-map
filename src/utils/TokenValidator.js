/* TokenValidator.js */
// @ts-check
// @ts-ignore
/// <reference path="./TokenValidator.d.ts" />

/** @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the token is valid
 * @property {string|null} error - Error message if validation failed
 * @property {number} [statusCode] - HTTP status code if applicable
 * @property {Object|null} sessionData - Session data if available
 */

/**
 * This file contains utilities for working with tokens for the SOS tracking system
 * Simplified to remove complex validation since we're now allowing anyone with the link to access
 */

/**
 * Validates an SOS access token against the session document
 * 
 * This function now simply checks that a token exists in the document,
 * which matches our updated Firestore security rules that allow any token.
 * 
 * @param {string} sessionId - The SOS session ID
 * @param {string} token - The access token (not actually validated)
 * @param {string} projectId - Firebase project ID
 * @param {string} apiKey - Firebase API key
 * @returns {Promise<Object>} - Promise resolving to { isValid: boolean, error?: string, sessionData?: Object }
 */
export async function validateSosToken(sessionId, token, projectId, apiKey) {
  if (!sessionId || !token || !projectId || !apiKey) {
    console.error('[TokenValidator] Missing required parameters');
    return {
      isValid: false,
      error: 'Missing required parameters',
      sessionData: null
    };
  }

  try {
    console.log(`[TokenValidator] Checking session existence: ${sessionId}`);
    
    // Create the REST API URL with proper encoding
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sos_sessions/${sessionId}`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('token', token); // Pass token for security rules
    
    // Make the request
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Check if the request was successful
    if (!response.ok) {
      console.error(`[TokenValidator] Failed with status ${response.status}: ${response.statusText}`);
      
      if (response.status === 404) {
        return {
          isValid: false,
          error: 'Session not found',
          statusCode: response.status,
          sessionData: null
        };
      }
      
      return {
        isValid: false,
        error: `API Error: ${response.status} ${response.statusText}`,
        statusCode: response.status,
        sessionData: null
      };
    }
    
    // Parse the response
    const data = await response.json();
    
    // We don't need to validate the token anymore, just check that the document exists
    // This matches our updated Firestore security rules
    console.log('[TokenValidator] Session exists, allowing access');
    return {
      isValid: true,
      error: null,
      sessionData: data
    };
  } catch (error) {
    console.error('[TokenValidator] Error checking session:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
      sessionData: null
    };
  }
}

/**
 * Helper function to extract the token from localStorage or URL
 */
export function getAccessToken() {
  // First try to get from URL if available
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  
  if (urlToken) {
    // Store in localStorage for future use
    localStorage.setItem('sos_access_token', urlToken);
    return urlToken;
  }
  
  // Fall back to localStorage
  return localStorage.getItem('sos_access_token');
}

/**
 * Helper function to modify a URL to include the token
 * 
 * @param {string} url - The URL to add the token to
 * @param {string} token - The token to add
 * @returns {string} - The URL with the token added
 */
export function addTokenToUrl(url, token) {
  if (!token) {
    console.warn('[TokenValidator] No token provided to add to URL');
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    // Make sure to encode the token properly to handle special characters
    urlObj.searchParams.set('token', encodeURIComponent(token));
    return urlObj.toString();
  } catch (error) {
    console.error('[TokenValidator] Error adding token to URL:', error);
    return url;
  }
}

/**
 * Checks if a document has the token field used in security rules
 * 
 * @param {any} data - Firestore document data
 * @returns {string|null} - The field name used for the token or null if not found
 */
export function detectTokenFieldName(data) {
  // @ts-ignore - We know what shape the data should have
  if (!data || !data.fields) return null;
  
  // Common token field names
  const possibleNames = ['token', 'accessToken', 'emergencyToken', 'emergencyAccessToken'];
  
  for (const name of possibleNames) {
    // @ts-ignore - We know what shape the data should have
    if (data.fields[name]?.stringValue) {
      return name;
    }
  }
  
  return null;
}