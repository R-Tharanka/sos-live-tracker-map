import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { Loader } from '@googlemaps/js-api-loader';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthContext';
// Import the debug helper for token issues if needed for troubleshooting
import TokenDebugHelper from './TokenDebugHelper';

// Google Maps API key from environment variables
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Interface for SOS session data
interface SOSSession {
  userId: string;
  startTime: Timestamp;
  active: boolean;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: Timestamp;
  };
  userInfo?: {
    name: string;
    bloodType?: string;
    age?: number;
    medicalConditions?: string[];
    allergies?: string[];
    medications?: string[];
    notes?: string;
  };
}

const MapTracker: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams(); // Needed for TokenDebugHelper
  const [session, setSession] = useState<SOSSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const { user } = useAuth();

  // Define function to update map marker based on session data
  const updateMapMarker = useCallback((data: SOSSession) => {
    if (data.location) {
      const position = {
        lat: data.location.latitude,
        lng: data.location.longitude
      };
      
      // Center map on new location
      mapRef.current?.setCenter(position);
      
      // Create or update marker
      if (markerRef.current) {
        markerRef.current.setPosition(position);
      } else {
        markerRef.current = new google.maps.Marker({
          position,
          map: mapRef.current,
          title: data.userInfo?.name || "SOS Location",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#FF0000",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#FFFFFF",
          },
        });
      }
      
      // Add accuracy circle if accuracy is provided
      if (data.location.accuracy) {
        new google.maps.Circle({
          map: mapRef.current,
          center: position,
          radius: data.location.accuracy,
          strokeColor: "#FF0000",
          strokeOpacity: 0.8,
          strokeWeight: 1,
          fillColor: "#FF0000",
          fillOpacity: 0.1,
        });
      }
    }
  }, []);
  
  // Function to fetch session data via REST API (for unauthenticated access)
  const fetchSessionData = useCallback(async () => {
    try {
      const currentToken = searchParams.get('token') || localStorage.getItem('sos_access_token');
      if (!currentToken || !sessionId) {
        throw new Error("Missing token or session ID");
      }
      
      console.log('[MapTracker] Polling for updates via REST API');
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      
      // Import and use TokenValidator utilities
      // @ts-ignore
      const { validateSosToken } = await import('../utils/TokenValidator');
      
      // Validate the token first before proceeding
      const validationResult = await validateSosToken(sessionId, currentToken, projectId, apiKey);
      
      if (!validationResult.isValid) {
        console.error('[MapTracker] Token validation failed:', validationResult.error);
        throw new Error(`Token validation failed: ${validationResult.error}`);
      }
      
      // If validation succeeded, we can use the session data directly
      const rawData = validationResult.sessionData;
      
      // Convert Firestore REST API response format to our SOSSession type
      const convertedData: SOSSession = {
        userId: rawData.fields?.userId?.stringValue || '',
        startTime: new Timestamp(
          rawData.fields?.startTime?.timestampValue ? 
          Math.floor(new Date(rawData.fields.startTime.timestampValue).getTime() / 1000) : 0,
          0
        ),
        active: rawData.fields?.active?.booleanValue || false,
      };
      
      // Convert location if present
      if (rawData.fields?.location?.mapValue?.fields) {
        const locFields = rawData.fields.location.mapValue.fields;
        convertedData.location = {
          latitude: locFields.latitude?.doubleValue || 0,
          longitude: locFields.longitude?.doubleValue || 0,
          accuracy: locFields.accuracy?.doubleValue,
          timestamp: new Timestamp(
            locFields.timestamp?.timestampValue ? 
            Math.floor(new Date(locFields.timestamp.timestampValue).getTime() / 1000) : 0,
            0
          )
        };
      }
      
      // Convert user info if present
      if (rawData.fields?.userInfo?.mapValue?.fields) {
        const userFields = rawData.fields.userInfo.mapValue.fields;
        convertedData.userInfo = {
          name: userFields.name?.stringValue || '',
          bloodType: userFields.bloodType?.stringValue,
          age: userFields.age?.integerValue ? parseInt(userFields.age.integerValue) : undefined,
          // Initialize empty arrays to avoid undefined errors
          medicalConditions: [],
          allergies: [],
          medications: [],
          notes: userFields.notes?.stringValue
        };
        
        // Convert arrays safely
        if (userFields.medicalConditions?.arrayValue?.values && convertedData.userInfo) {
          convertedData.userInfo.medicalConditions = userFields.medicalConditions.arrayValue.values.map(
            (v: any) => v.stringValue || ''
          );
        }
        
        if (userFields.allergies?.arrayValue?.values && convertedData.userInfo) {
          convertedData.userInfo.allergies = userFields.allergies.arrayValue.values.map(
            (v: any) => v.stringValue || ''
          );
        }
        
        if (userFields.medications?.arrayValue?.values && convertedData.userInfo) {
          convertedData.userInfo.medications = userFields.medications.arrayValue.values.map(
            (v: any) => v.stringValue || ''
          );
        }
      }
      
      return convertedData;
    } catch (error) {
      console.error('[MapTracker] Error fetching session data via REST:', error);
      return null;
    }
  }, [sessionId, searchParams]);
  
  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }
    
    // Get the token from URL parameters first
    const urlToken = searchParams.get('token');
    
    // Always update the token in localStorage from URL if available
    if (urlToken) {
      localStorage.setItem('sos_access_token', urlToken);
      console.log('[MapTracker] Token from URL saved to localStorage:', urlToken.substring(0, 5) + '...');
    } else {
      // If no token in URL but we have one in localStorage, still use it
      const storedToken = localStorage.getItem('sos_access_token');
      if (storedToken) {
        console.log('[MapTracker] Using token from localStorage:', storedToken.substring(0, 5) + '...');
      } else {
        console.error('[MapTracker] No access token available for this session');
        setError('Missing access token. Please use the complete emergency link sent in the SOS message.');
        setLoading(false);
        return;
      }
    }
    
    // Record if this is an authenticated session or public emergency access
    const accessMode = user ? 'authenticated' : 'emergency_access';
    console.log(`[MapTracker] Accessing session in ${accessMode} mode with ${urlToken ? 'token from URL' : 'stored token'}`);
    
    // Load Google Maps
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: "weekly",
    });

    let unsubscribe: (() => void) | undefined;
    let pollingInterval: number | undefined;

    // Initialize map and listen for session updates
    const initializeMap = async () => {
      try {
        await loader.load();
        
        // Wait for DOM to be fully loaded before initializing map
        setTimeout(() => {
          try {
            // Ensure the map div exists
            const mapElement = document.getElementById("map");
            if (!mapElement) {
              console.error('[MapTracker] Map element not found in DOM');
              setError("Error initializing map: Map element not found");
              setLoading(false);
              return;
            }
            
            // Make sure the map element is visible and has dimensions
            mapElement.style.width = "100%";
            mapElement.style.height = "calc(100% - 200px)";
            
            console.log('[MapTracker] Initializing map with element:', mapElement);
            
            // Create the map instance
            mapRef.current = new google.maps.Map(mapElement, {
              center: { lat: 0, lng: 0 },
              zoom: 15,
              mapTypeControl: true,
              fullscreenControl: true,
              streetViewControl: false,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
            });
            
            console.log('[MapTracker] Map initialized successfully');
          } catch (error) {
            console.error('[MapTracker] Error during map initialization:', error);
            setError(`Error initializing map: ${error instanceof Error ? error.message : String(error)}`);
            setLoading(false);
          }
        }, 1000); // Give more time for the DOM to render completely

        // Use different approaches for authenticated vs public access
        if (user) {
          console.log('[MapTracker] Using Firebase SDK with authentication');
          // For authenticated users, use the Firebase SDK with onSnapshot
          const sessionRef = doc(db, "sos_sessions", sessionId);
          
          unsubscribe = onSnapshot(
            sessionRef,
            { includeMetadataChanges: true },
            (docSnapshot) => {
              if (docSnapshot.exists()) {
                const data = docSnapshot.data() as SOSSession;
                setSession(data);
                updateMapMarker(data);
                setLoading(false);
              } else {
                setError("SOS session not found or has expired");
                setLoading(false);
              }
            },
            (error) => {
              console.error("[MapTracker] Error loading session data via SDK:", error);
              setError("Error loading SOS session data");
              setLoading(false);
            }
          );
        } else {
          console.log('[MapTracker] Using REST API polling for public access');
          // For public access, use REST API polling
          const pollData = async () => {
            const data = await fetchSessionData();
            if (data) {
              setSession(data);
              updateMapMarker(data);
              setLoading(false);
            } else if (loading) {
              // Only show error if we're still loading (avoid overwriting previous data)
              setError("Could not load SOS session data. Please try refreshing.");
              setLoading(false);
            }
          };
          
          // Initial fetch
          await pollData();
          
          // Set up polling - using 3 seconds as a balance between responsiveness and resource usage
          pollingInterval = window.setInterval(pollData, 3000);
        }
      } catch (err) {
        console.error("[MapTracker] Error initializing map:", err);
        setError("Error initializing map");
        setLoading(false);
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [sessionId]);

  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.toMillis()).toLocaleString();
  };

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading emergency location...</h2>
        <p>Please wait while we fetch the latest location data.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Error Loading Emergency Location</h2>
          <p>{error}</p>
          <p>This may be due to:</p>
          <ul>
            <li>Invalid or expired emergency link</li>
            <li>The emergency has been resolved</li>
            <li>Network connection issues</li>
          </ul>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 15px',
              background: '#0284c7',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '15px'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div className="header">
        <h1>ClimateReady SOS Emergency</h1>
        {session?.active === false && (
          <div style={{ color: '#9c9c9c', fontSize: '0.9rem' }}>
            This emergency has been marked as resolved
          </div>
        )}
      </div>
      
      {/* Ensure map div has explicit height and is positioned correctly */}
      <div id="map" style={{ 
        width: "100%", 
        height: "calc(100% - 200px)", 
        position: "absolute",
        top: "60px", 
        left: 0, 
        right: 0,
        zIndex: 1
      }}></div>
      
      {/* Show token debug helper to troubleshoot token issues */}
      
      {session && (
        <div className="emergency-info">
          <h2>Emergency Information</h2>
          <ul className="info-list">
            {session.userInfo?.name && (
              <li className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">{session.userInfo.name}</span>
              </li>
            )}
            
            {session.userInfo?.bloodType && (
              <li className="info-item">
                <span className="info-label">Blood Type:</span>
                <span className="info-value">{session.userInfo.bloodType}</span>
              </li>
            )}
            
            {session.userInfo?.age && (
              <li className="info-item">
                <span className="info-label">Age:</span>
                <span className="info-value">{session.userInfo.age}</span>
              </li>
            )}
            
            {session.userInfo?.medicalConditions && session.userInfo.medicalConditions.length > 0 && (
              <li className="info-item">
                <span className="info-label">Medical Conditions:</span>
                <span className="info-value">{session.userInfo.medicalConditions.join(", ")}</span>
              </li>
            )}
            
            {session.userInfo?.allergies && session.userInfo.allergies.length > 0 && (
              <li className="info-item">
                <span className="info-label">Allergies:</span>
                <span className="info-value">{session.userInfo.allergies.join(", ")}</span>
              </li>
            )}
            
            {session.userInfo?.medications && session.userInfo.medications.length > 0 && (
              <li className="info-item">
                <span className="info-label">Medications:</span>
                <span className="info-value">{session.userInfo.medications.join(", ")}</span>
              </li>
            )}
            
            {session.userInfo?.notes && (
              <li className="info-item">
                <span className="info-label">Additional Notes:</span>
                <span className="info-value">{session.userInfo.notes}</span>
              </li>
            )}
          </ul>
          
          {session.location && (
            <div className="last-updated">
              Last updated: {formatTimestamp(session.location.timestamp)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapTracker;