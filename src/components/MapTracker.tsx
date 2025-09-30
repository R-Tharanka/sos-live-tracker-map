import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { Loader } from '@googlemaps/js-api-loader';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthContext';

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
  const [session, setSession] = useState<SOSSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    // Load Google Maps
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: "weekly",
    });

    let unsubscribe: () => void;

    // Initialize map and listen for session updates
    const initializeMap = async () => {
      try {
        await loader.load();
        
        // Create map instance
        const mapElement = document.getElementById("map") as HTMLElement;
        mapRef.current = new google.maps.Map(mapElement, {
          center: { lat: 0, lng: 0 },
          zoom: 15,
          mapTypeControl: true,
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
        });

        // Listen for session updates
        unsubscribe = onSnapshot(
          doc(db, "sos_sessions", sessionId),
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data() as SOSSession;
              setSession(data);
              
              // Update map marker if location exists
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
              
              setLoading(false);
            } else {
              setError("SOS session not found or has expired");
              setLoading(false);
            }
          },
          (error) => {
            console.error("Error loading session data:", error);
            setError("Error loading SOS session data");
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Error initializing map:", err);
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
    return <div className="error-message">{error}</div>;
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
      
      <div id="map" style={{ width: "100%", height: "100%" }}></div>
      
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