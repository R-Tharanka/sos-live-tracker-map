import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

/**
 * This component helps debug token issues with the Firebase security rules
 * It can be added to the MapTracker component temporarily
 */
const TokenDebugHelper: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  useEffect(() => {
    const accessToken = searchParams.get('token');
    const storedToken = localStorage.getItem('sos_access_token');
    const emergencyAccess = localStorage.getItem('emergency_public_access');
    const storedSessionId = localStorage.getItem('sos_session_id');
    
    setDebugInfo({
      sessionId,
      urlToken: accessToken,
      storedToken,
      emergencyAccess,
      storedSessionId,
      tokenMatch: accessToken === storedToken,
      sessionMatch: sessionId === storedSessionId
    });
  }, [sessionId, searchParams]);
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      left: '10px', 
      zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '10px',
      borderRadius: '4px',
      fontSize: '11px',
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 5px', fontSize: '12px' }}>Token Debug Info</h4>
      <div style={{ fontFamily: 'monospace' }}>
        <div>Session ID: {debugInfo.sessionId}</div>
        <div>URL Token: {debugInfo.urlToken?.substring(0, 5)}...</div>
        <div>Stored Token: {debugInfo.storedToken?.substring(0, 5)}...</div>
        <div>Token Match: {debugInfo.tokenMatch ? '✅' : '❌'}</div>
        <div>Session Match: {debugInfo.sessionMatch ? '✅' : '❌'}</div>
      </div>
    </div>
  );
};

export default TokenDebugHelper;