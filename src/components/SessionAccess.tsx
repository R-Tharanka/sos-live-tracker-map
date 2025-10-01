import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './SessionAccess.css';

// Get Firebase project ID from environment variables
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

const SessionAccess: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('token');
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { createTempUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const validateSession = async () => {
      try {
        console.log('[SessionAccess] Starting session validation...');
        if (!sessionId) {
          setError('Invalid session link');
          setIsValidating(false);
          return;
        }

        // Check if access token is provided
        if (!accessToken) {
          console.error('[SessionAccess] No access token provided');
          setError('This emergency link is missing a required access token. Please use the complete link sent in the SOS message.');
          setIsValidating(false);
          return;
        }

        // Using direct REST API to validate the session with token
        // This avoids issues with the Firebase SDK streaming listeners
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        
        // Create URL object to properly handle query parameters
        const restApiUrl = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sos_sessions/${sessionId}`);
        
        // Add query parameters
        restApiUrl.searchParams.set('key', import.meta.env.VITE_FIREBASE_API_KEY);
        restApiUrl.searchParams.set('token', accessToken);
        
        console.log('[SessionAccess] Validating session via REST API');
        const response = await fetch(restApiUrl);

        if (!response.ok) {
          console.error('[SessionAccess] REST API validation failed:', response.status, response.statusText);
          setError('Invalid emergency access link. Please check that you\'re using the complete link sent in the SOS message.');
          setIsValidating(false);
          return;
        }

        const responseData = await response.json();
        console.log('[SessionAccess] Session data retrieved successfully');

        // Extract the accessToken from the fields to validate it matches the provided one
        const sessionData = {
          accessToken: responseData.fields?.accessToken?.stringValue || '',
          // Extract other fields if needed
        };

        // Verify the access token matches
        if (accessToken !== sessionData.accessToken) {
          console.error('[SessionAccess] Token validation failed:',
            { providedToken: accessToken, requiredToken: sessionData.accessToken });
          setError('Invalid emergency access link. Please check that you\'re using the complete link sent in the SOS message.');
          setIsValidating(false);
          return;
        }

        // Record this access in the session document using REST API
        // We need to use REST API instead of SDK for unauthenticated users
        try {
          console.log('[SessionAccess] Recording access log via REST API');
          
          // Construct the REST API URL for patching the document
          const updateUrl = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sos_sessions/${sessionId}`);
          updateUrl.searchParams.set('key', import.meta.env.VITE_FIREBASE_API_KEY);
          updateUrl.searchParams.set('token', accessToken);
          updateUrl.searchParams.set('updateMask.fieldPaths', 'accessLogs');
          
          // Current timestamp in RFC3339 format for REST API
          const timestamp = new Date().toISOString();
          
          // Send the PATCH request
          const updateResponse = await fetch(updateUrl.toString(), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                accessLogs: {
                  arrayValue: {
                    values: [
                      {
                        mapValue: {
                          fields: {
                            timestamp: { timestampValue: timestamp },
                            type: { stringValue: 'web_access' },
                            hasToken: { booleanValue: true }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            })
          });
          
          if (!updateResponse.ok) {
            console.warn('[SessionAccess] Failed to log access:', updateResponse.status, updateResponse.statusText);
          } else {
            console.log('[SessionAccess] Access log recorded successfully');
          }
        } catch (logError) {
          // Non-critical error, just log it
          console.warn('[SessionAccess] Could not log access:', logError);
        }

        console.log('[SessionAccess] Session validated successfully');
        
        // Store the session ID and access token in localStorage for simpler access management
        localStorage.setItem('sos_session_id', sessionId);
        localStorage.setItem('emergency_public_access', 'true');
        localStorage.setItem('sos_access_token', accessToken);
        console.log('[SessionAccess] Token stored in localStorage:', accessToken.substring(0, 5) + '...');

        // Redirect directly to the map view without authentication
        // Include the token in the URL for the MapTracker component to use
        navigate(`/map/${sessionId}?token=${accessToken}`);
      } catch (error) {
        console.error('Error validating session:', error);
        setError('Failed to validate session access');
        setIsValidating(false);
      }
    };

    validateSession();
  }, [sessionId, accessToken, navigate]);

  if (isValidating) {
    return (
      <div className="session-access-container">
        <div className="loading-spinner"></div>
        <p>Validating access to emergency session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="session-access-container">
        <div className="error-message">
          <h3>Access Error</h3>
          <p>{error}</p>
          <button 
            className="try-again-button" 
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return null; // Should never reach here as we either show loading or error, or redirect
};

export default SessionAccess;