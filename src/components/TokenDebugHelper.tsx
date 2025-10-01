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
    
    // Detect if running on a mobile device (for easier debugging)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Check if the token is properly encoded in the URL
    let tokenInUrl = false;
    try {
      const currentUrl = window.location.href;
      tokenInUrl = currentUrl.includes('token=');
    } catch (e) {
      console.error('Error checking URL for token:', e);
    }
    
    setDebugInfo({
      sessionId,
      urlToken: accessToken,
      storedToken,
      emergencyAccess,
      storedSessionId,
      tokenMatch: accessToken === storedToken,
      sessionMatch: sessionId === storedSessionId,
      tokenInUrl,
      userAgent: isMobile ? 'Mobile' : 'Desktop',
      currentUrl: window.location.href.substring(0, 30) + '...'
    });
    
    // Log for easier debugging
    console.log('TokenDebugHelper - Session ID:', sessionId);
    console.log('TokenDebugHelper - Token in URL:', accessToken);
    console.log('TokenDebugHelper - Token in localStorage:', storedToken);
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
        <div>URL Token: {debugInfo.urlToken ? `${debugInfo.urlToken?.substring(0, 5)}...` : '❌ Missing!'}</div>
        <div>Stored Token: {debugInfo.storedToken ? `${debugInfo.storedToken?.substring(0, 5)}...` : '❌ Missing!'}</div>
        <div>Token Match: {debugInfo.tokenMatch ? '✅' : '❌'}</div>
        <div>Session Match: {debugInfo.sessionMatch ? '✅' : '❌'}</div>
        <div>Token in URL: {debugInfo.tokenInUrl ? '✅' : '❌'}</div>
        <div>Device: {debugInfo.userAgent}</div>
        <button 
          onClick={() => {
            // Force token refresh
            if (debugInfo.urlToken) {
              localStorage.setItem('sos_access_token', debugInfo.urlToken);
              alert('Token refreshed from URL!');
              window.location.reload();
            } else if (debugInfo.sessionId) {
              // If no token in URL, try to extract from current URL
              const url = window.location.href;
              const tokenMatch = url.match(/token=([^&]+)/);
              if (tokenMatch && tokenMatch[1]) {
                localStorage.setItem('sos_access_token', tokenMatch[1]);
                alert('Token extracted from URL!');
                window.location.reload();
              } else {
                alert('No token found in URL!');
              }
            }
          }}
          style={{ 
            marginTop: '8px',
            padding: '4px 8px',
            fontSize: '10px',
            backgroundColor: '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Token
        </button>
      </div>
    </div>
  );
};

export default TokenDebugHelper;