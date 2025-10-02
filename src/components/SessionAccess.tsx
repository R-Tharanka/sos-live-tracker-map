import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import './SessionAccess.css';

const SessionAccess: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('token');
  const navigate = useNavigate();

  useEffect(() => {
    const processSession = async () => {
      if (!sessionId || !accessToken) {
        console.error('[SessionAccess] Missing session ID or token');
        return;
      }

      try {
        console.log('[SessionAccess] Processing session access...');
        
        // With our simplified Firestore rules, we can just redirect to the map view
        // No need to validate the token first
        
        // Store token for future use
        localStorage.setItem('sos_access_token', accessToken);
        localStorage.setItem('sos_session_id', sessionId);
        
        // Navigate to the map tracker with the token
        console.log('[SessionAccess] Redirecting to map with token');
        navigate(`/map/${sessionId}?token=${encodeURIComponent(accessToken)}`);
      } catch (error: any) {
        console.error('[SessionAccess] Error processing session:', error);
      }
    };

    processSession();
  }, [sessionId, accessToken, navigate]);

  return (
    <div className="session-access-container">
      <div className="loading-spinner"></div>
      <p>Redirecting to emergency tracking map...</p>
    </div>
  );
};

export default SessionAccess;