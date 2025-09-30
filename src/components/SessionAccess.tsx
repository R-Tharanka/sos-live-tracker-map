import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthContext';
import './SessionAccess.css';

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
        if (!sessionId) {
          setError('Invalid session link');
          setIsValidating(false);
          return;
        }

        // Check if session exists
        const sessionRef = doc(db, 'sos_sessions', sessionId);
        const sessionDoc = await getDoc(sessionRef);

        if (!sessionDoc.exists()) {
          setError('SOS session not found');
          setIsValidating(false);
          return;
        }

        const sessionData = sessionDoc.data();
        let isValidAccess = false;
        
        // Verify the access token if provided
        if (accessToken) {
          // Compare with the token stored in the session
          if (accessToken === sessionData.accessToken) {
            isValidAccess = true;
          }
        }

        if (!isValidAccess && sessionData.accessToken) {
          setError('This emergency session requires a valid access token');
          setIsValidating(false);
          return;
        }

        // Record this access in the session document
        try {
          await updateDoc(sessionRef, {
            accessLogs: arrayUnion({
              timestamp: serverTimestamp(),
              type: 'web_access',
              hasToken: !!accessToken
            })
          });
        } catch (logError) {
          // Non-critical error, just log it
          console.warn('Could not log access:', logError);
        }

        // Store the session ID in localStorage for simpler access management
        localStorage.setItem('sos_session_id', sessionId);
        localStorage.setItem('emergency_public_access', 'true');

        // Redirect directly to the map view without authentication
        navigate(`/map/${sessionId}`);
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