// Debug Dashboard for SOS Emergency Access
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getAccessToken, detectTokenFieldName } from '../utils/TokenValidator';

interface DiagnosticRecord {
  timestamp: Date;
  event: string;
  details: any;
  status: 'success' | 'warning' | 'error' | 'info';
}

const SosDebugDashboard: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState<DiagnosticRecord[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    // Add initial log entry
    addLogEntry(
      'Dashboard initialized',
      { 
        url: window.location.href,
        sessionId,
        token: searchParams.get('token') ? `${searchParams.get('token')?.substring(0, 5)}...` : 'none',
        hasToken: !!searchParams.get('token'),
      },
      'info'
    );

    // Fetch session information if available
    fetchSessionInfo();

    // Intercept console logs to capture them
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.log = function(...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('[')) {
        addLogEntry(args[0], args.slice(1), 'info');
      }
      originalConsoleLog.apply(console, args);
    };

    console.error = function(...args) {
      if (args[0] && typeof args[0] === 'string') {
        addLogEntry(args[0], args.slice(1), 'error');
      }
      originalConsoleError.apply(console, args);
    };

    console.warn = function(...args) {
      if (args[0] && typeof args[0] === 'string') {
        addLogEntry(args[0], args.slice(1), 'warning');
      }
      originalConsoleWarn.apply(console, args);
    };

    return () => {
      // Restore original console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, [sessionId, searchParams]);

  const fetchSessionInfo = async () => {
    if (!sessionId) return;

    try {
      const token = getAccessToken();
      if (!token) {
        addLogEntry('No access token available', {}, 'error');
        return;
      }

      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      
      if (!projectId || !apiKey) {
        addLogEntry('Missing Firebase configuration', { hasProjectId: !!projectId, hasApiKey: !!apiKey }, 'error');
        return;
      }

      // Import validateSosToken dynamically to avoid TypeScript issues
      const { validateSosToken } = await import('../utils/TokenValidator');
      const result = await validateSosToken(sessionId, token, projectId, apiKey);
      
      if (result.isValid) {
        setSessionInfo(result.sessionData);
        addLogEntry('Session information retrieved', { 
          tokenField: detectTokenFieldName(result.sessionData),
          active: result.sessionData?.fields?.active?.booleanValue,
          hasLocation: !!result.sessionData?.fields?.location
        }, 'success');
      } else {
        addLogEntry('Failed to retrieve session info', { 
          error: result.error,
          statusCode: result.statusCode
        }, 'error');
      }
    } catch (error: any) {
      addLogEntry('Error fetching session info', { message: error.message }, 'error');
    }
  };

  const addLogEntry = (event: string, details: any, status: 'success' | 'warning' | 'error' | 'info') => {
    setLogs(prevLogs => [
      ...prevLogs,
      {
        timestamp: new Date(),
        event,
        details,
        status
      }
    ]);
  };

  if (import.meta.env.PROD && !import.meta.env.VITE_ENABLE_DEBUG) {
    return null; // Don't render in production unless explicitly enabled
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: isExpanded ? '0' : '-400px',
      left: '0',
      right: '0',
      height: '400px',
      background: 'rgba(0,0,0,0.85)',
      color: 'white',
      zIndex: 9999,
      padding: '5px',
      overflow: 'hidden',
      transition: 'bottom 0.3s ease',
      fontFamily: 'monospace',
      fontSize: '11px'
    }}>
      <div
        style={{
          position: 'absolute',
          top: '-25px',
          right: '20px',
          background: 'rgba(0,0,0,0.7)',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          padding: '3px 8px',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        Debug {isExpanded ? '▼' : '▲'}
      </div>

      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ width: '70%', overflowY: 'auto', borderRight: '1px solid #444', padding: '5px' }}>
          <h3 style={{ margin: '0 0 5px' }}>Diagnostic Log</h3>
          <div>
            {logs.map((log, idx) => (
              <div key={idx} style={{ 
                borderBottom: '1px solid #333',
                padding: '3px 0',
                color: log.status === 'error' ? '#ff6b6b' : 
                       log.status === 'warning' ? '#ffd166' :
                       log.status === 'success' ? '#06d6a0' : 'white'
              }}>
                <div>
                  <span style={{ color: '#888', marginRight: '5px' }}>
                    {log.timestamp.toLocaleTimeString()}:
                  </span>
                  {log.event}
                </div>
                {Object.keys(log.details).length > 0 && (
                  <div style={{ fontSize: '10px', color: '#bbb', marginLeft: '10px' }}>
                    {JSON.stringify(log.details)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: '30%', overflowY: 'auto', padding: '5px' }}>
          <h3 style={{ margin: '0 0 5px' }}>Session Info</h3>
          {sessionInfo ? (
            <pre style={{ fontSize: '10px', margin: 0 }}>
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          ) : (
            <div>No session info available</div>
          )}
          
          <h3 style={{ margin: '10px 0 5px' }}>Local Storage</h3>
          <div style={{ fontSize: '10px' }}>
            <div>token: {localStorage.getItem('sos_access_token')?.substring(0, 5) + '...' || 'none'}</div>
            <div>session_id: {localStorage.getItem('sos_session_id') || 'none'}</div>
          </div>
          
          <div style={{ marginTop: '15px' }}>
            <button 
              onClick={() => {
                localStorage.removeItem('sos_access_token');
                localStorage.removeItem('sos_session_id');
                localStorage.removeItem('emergency_public_access');
                addLogEntry('Local storage cleared', {}, 'info');
                window.location.reload();
              }}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              Clear Storage & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SosDebugDashboard;