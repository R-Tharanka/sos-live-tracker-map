import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
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

        // Check if session exists and token is valid
        const sessionRef = doc(db, 'sos_sessions', sessionId);
        const sessionDoc = await getDoc(sessionRef);

        if (!sessionDoc.exists()) {
          setError('SOS session not found');
          setIsValidating(false);
          return;
        }

        const sessionData = sessionDoc.data();
        
        // Verify the access token if provided
        if (accessToken) {
          // In a real app, you'd verify the token with a proper mechanism
          // This is a simplified example
          if (accessToken !== sessionData.accessToken) {
            setError('Invalid access token');
            setIsValidating(false);
            return;
          }
        }

        // Create a temporary user for this session
        await createTempUser(sessionId);

        // Redirect to the map view for this session
        navigate(`/map/${sessionId}`);
      } catch (error) {
        console.error('Error validating session:', error);
        setError('Failed to validate session access');
        setIsValidating(false);
      }
    };

    validateSession();
  }, [sessionId, accessToken, createTempUser, navigate]);

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