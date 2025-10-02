// Emergency Access Diagnostic Tool
import React, { useState, useEffect } from 'react';

// Define result type for better type checking
interface TestResult {
  sessionId: string;
  token: string;
  encodedToken: string;
  rawTokenTest: {
    success: boolean;
    error?: string;
    statusCode?: number;
  };
  encodedTokenTest: {
    success: boolean;
    error?: string;
    statusCode?: number;
  } | string;
  tokenFieldName?: string;
  sessionData: any;
}

/**
 * This tool tests the emergency access flow by making a direct REST API call to 
 * Firestore to validate token access. This is useful for debugging issues with 
 * token access where the user sees "Invalid emergency access link" errors.
 */
const EmergencyAccessTester: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract session ID and token from the URL when loaded
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const pathParts = url.pathname.split('/');
      // If format is /session/{sessionId} or /access/{sessionId}
      if (pathParts.length >= 3 && (pathParts[1] === 'session' || pathParts[1] === 'access')) {
        setSessionId(pathParts[2]);
      }
      
      const tokenParam = url.searchParams.get('token');
      if (tokenParam) {
        setToken(tokenParam);
      }
    } catch (e) {
      console.error('Error parsing URL:', e);
    }
  }, []);

  // Helper function to detect token field name in document
  const detectTokenFieldName = (data: any): string | null => {
    if (!data || !data.fields) return null;
    
    // Check common token field names
    const possibleNames = ['token', 'accessToken', 'emergencyToken', 'emergencyAccessToken'];
    
    for (const name of possibleNames) {
      if (data.fields[name]?.stringValue) {
        return name;
      }
    }
    
    return null;
  };

  const runTest = async () => {
    if (!sessionId || !token) {
      setError('Both session ID and token are required');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      
      console.log(`[EmergencyAccessTester] Testing token validation for session: ${sessionId}`);
      
      // Use our TokenValidator utility
      const { validateSosToken } = await import('../utils/TokenValidator');
      
      // Test with both raw and encoded token to see which one works
      const rawTokenResult = await validateSosToken(sessionId, token, projectId, apiKey);
      
      // Try with encoded token as well (to diagnose encoding issues)
      const encodedToken = encodeURIComponent(token);
      let encodedTokenResult: any = null;
      if (encodedToken !== token) {
        encodedTokenResult = await validateSosToken(sessionId, encodedToken, projectId, apiKey);
      }
      
      const validationSuccessful = rawTokenResult.isValid || (encodedTokenResult && encodedTokenResult.isValid);
      
      // Set result with all information for debugging
      setResult({
        sessionId,
        token,
        encodedToken,
        rawTokenTest: {
          success: rawTokenResult.isValid,
          error: rawTokenResult.error || undefined,
          statusCode: rawTokenResult.statusCode
        },
        encodedTokenTest: encodedTokenResult ? {
          success: encodedTokenResult.isValid,
          error: encodedTokenResult.error || undefined,
          statusCode: encodedTokenResult.statusCode
        } : 'Not tested (token already encoded)',
        tokenFieldName: rawTokenResult.sessionData ? 
          detectTokenFieldName(rawTokenResult.sessionData) || undefined : undefined,
        sessionData: rawTokenResult.sessionData || null
      });

      // Set error message based on results
      if (!validationSuccessful) {
        if (rawTokenResult.statusCode === 400) {
          setError('Error 400: Bad Request - Check that the token parameter is correctly formatted');
        } else if (rawTokenResult.statusCode === 403) {
          setError('Error 403: Forbidden - Token validation failed. The token does not match the document.');
        } else if (rawTokenResult.statusCode === 404) {
          setError('Error 404: Not Found - The session ID does not exist or has been deleted');
        } else {
          setError(`Token validation failed: ${rawTokenResult.error}`);
        }
      }
    } catch (error: any) {
      console.error('[EmergencyAccessTester] Error testing access:', error);
      setError(`Network error: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.85)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflowY: 'auto',
      fontFamily: 'monospace',
      fontSize: '12px',
      boxShadow: '0 0 10px rgba(0,0,0,0.5)'
    }}>
      <h3 style={{ margin: '0 0 10px' }}>Emergency Access Tester</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Session ID:</label>
          <input 
            type="text" 
            value={sessionId} 
            onChange={(e) => setSessionId(e.target.value)}
            style={{ width: '100%', padding: '5px', marginBottom: '10px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Token:</label>
          <input 
            type="text" 
            value={token} 
            onChange={(e) => setToken(e.target.value)}
            style={{ width: '100%', padding: '5px', marginBottom: '10px' }}
          />
        </div>
        
        <button 
          onClick={runTest} 
          disabled={loading || !sessionId || !token}
          style={{
            padding: '8px 12px',
            background: '#0284c7',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: loading || !sessionId || !token ? 'not-allowed' : 'pointer',
            opacity: loading || !sessionId || !token ? 0.7 : 1
          }}
        >
          {loading ? 'Testing...' : 'Test Access'}
        </button>
      </div>
      
      {error && (
        <div style={{ 
          background: '#dc2626', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '10px' 
        }}>
          {error}
        </div>
      )}
      
      {result && (
        <div>
          <h4>Test Results:</h4>
          <div style={{ 
            background: result.rawTokenTest.success ? '#16a34a' : '#dc2626',
            color: 'white',
            padding: '5px',
            borderRadius: '4px',
            marginBottom: '5px'
          }}>
            Raw Token Test: {result.rawTokenTest.success ? 'Success' : 'Failed'}
            {result.rawTokenTest.statusCode && ` (Status: ${result.rawTokenTest.statusCode})`}
          </div>
          
          {typeof result.encodedTokenTest !== 'string' && (
            <div style={{ 
              background: result.encodedTokenTest.success ? '#16a34a' : '#dc2626',
              color: 'white',
              padding: '5px',
              borderRadius: '4px',
              marginBottom: '5px'
            }}>
              Encoded Token Test: {result.encodedTokenTest.success ? 'Success' : 'Failed'}
              {result.encodedTokenTest.statusCode !== undefined && ` (Status: ${result.encodedTokenTest.statusCode})`}
            </div>
          )}
          
          <div style={{ marginTop: '10px' }}>
            <strong>Token Field Name: </strong> {result.tokenFieldName || 'Not found'}
          </div>
          
          <div style={{ marginTop: '10px' }}>
            <strong>Session Data:</strong>
            <pre style={{ 
              background: '#222', 
              padding: '5px', 
              borderRadius: '4px',
              maxHeight: '200px',
              overflow: 'auto',
              fontSize: '10px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {JSON.stringify(result.sessionData, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '15px', borderTop: '1px solid #444', paddingTop: '10px', fontSize: '10px' }}>
        <p>This tool helps debug emergency access link issues.</p>
        <p>1. It automatically extracts the session ID and token from your URL</p>
        <p>2. It tests direct access to the session document via Firestore REST API</p>
        <p>3. It shows any errors that might be preventing access</p>
      </div>
    </div>
  );
};

export default EmergencyAccessTester;