import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { Loader } from '@googlemaps/js-api-loader';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthContext';
import TokenDebugHelper from './TokenDebugHelper';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface SOSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: Timestamp;
}

interface SOSUserInfo {
  name?: string;
  bloodType?: string;
  age?: number;
  medicalConditions?: string[];
  allergies?: string[];
  medications?: string[];
  notes?: string;
}

interface SOSSession {
  userId?: string;
  startTime?: Timestamp;
  active?: boolean;
  location?: SOSLocation;
  userInfo?: SOSUserInfo;
}

const MAP_OPTIONS: google.maps.MapOptions = {
  center: { lat: 0, lng: 0 },
  zoom: 16,
  mapTypeControl: true,
  fullscreenControl: true,
  streetViewControl: false,
  mapTypeId: 'roadmap',
  disableDefaultUI: false,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const convertToTimestamp = (value?: string | number): Timestamp | undefined => {
  if (!value) return undefined;

  if (typeof value === 'number') {
    return Timestamp.fromMillis(value);
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return undefined;

  return Timestamp.fromMillis(parsed);
};

const readNumber = (value?: { doubleValue?: number; integerValue?: string | number; stringValue?: string }): number | undefined => {
  if (!value) return undefined;
  if (typeof value.doubleValue === 'number') return value.doubleValue;
  if (typeof value.integerValue === 'number') return value.integerValue;
  if (typeof value.integerValue === 'string') {
    const parsed = Number(value.integerValue);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (typeof value.stringValue === 'string') {
    const parsed = Number(value.stringValue);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const readStringArray = (values?: Array<{ stringValue?: string }>): string[] => {
  if (!values?.length) return [];
  return values.map((value) => value.stringValue || '').filter(Boolean);
};

const MapTracker: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [session, setSession] = useState<SOSSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Preparing live tracker...');
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<Loader | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);

  const isDebugMode = import.meta.env.DEV;

  const loader = useMemo(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      return null;
    }

    if (!loaderRef.current) {
      loaderRef.current = new Loader({
        apiKey: GOOGLE_MAPS_API_KEY,
        version: 'weekly',
      });
    }

    return loaderRef.current;
  }, []);

  const updateMapMarker = useCallback((data: SOSSession) => {
    if (!data.location || !mapRef.current) return;

    const { latitude, longitude, accuracy } = data.location;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

    const position = { lat: latitude, lng: longitude };

    mapRef.current.setCenter(position);

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position,
        map: mapRef.current,
        title: data.userInfo?.name || 'Current SOS location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: '#ffffff',
        },
        animation: google.maps.Animation.DROP,
      });
    } else {
      markerRef.current.setPosition(position);
    }

    if (typeof accuracy === 'number' && accuracy > 0) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = new google.maps.Circle({
          map: mapRef.current,
          fillColor: '#ef4444',
          fillOpacity: 0.08,
          strokeColor: '#ef4444',
          strokeOpacity: 0.6,
          strokeWeight: 1,
        });
      }

      accuracyCircleRef.current.setCenter(position);
      accuracyCircleRef.current.setRadius(Math.max(accuracy, 10));
      accuracyCircleRef.current.setMap(mapRef.current);
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
    }
  }, []);

  const ensureMapReady = useCallback(async () => {
    if (mapRef.current) {
      return mapRef.current;
    }

    if (!loader) {
      throw new Error('Google Maps API key is missing.');
    }

    await loader.load();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (mapContainerRef.current) break;
      // eslint-disable-next-line no-await-in-loop
      await wait(75);
    }

    const container = mapContainerRef.current;

    if (!container) {
      throw new Error('Map container element not found.');
    }

    if (!container.style.height) {
      container.style.height = '100%';
    }

    mapRef.current = new google.maps.Map(container, MAP_OPTIONS);
    return mapRef.current;
  }, [loader]);

  const fetchSessionData = useCallback(
    async (accessToken: string): Promise<SOSSession | null> => {
      if (!sessionId) return null;

      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

      if (!projectId || !apiKey) {
        console.error('[MapTracker] Missing Firebase REST configuration');
        return null;
      }

      try {
        const { validateSosToken } = await import('../utils/TokenValidator');
        const validation = await validateSosToken(sessionId, accessToken, projectId, apiKey);

        if (!validation.isValid || !validation.sessionData) {
          console.error('[MapTracker] Token validation failed:', validation.error);
          return null;
        }

        const raw = validation.sessionData;
        const fields = raw?.fields ?? {};

        const converted: SOSSession = {
          userId: fields.userId?.stringValue,
          startTime: convertToTimestamp(fields.startTime?.timestampValue),
          active: fields.active?.booleanValue ?? true,
        };

        const locationFields = fields.location?.mapValue?.fields;
        if (locationFields) {
          const latitude = readNumber(locationFields.latitude);
          const longitude = readNumber(locationFields.longitude);

          if (typeof latitude === 'number' && typeof longitude === 'number') {
            converted.location = {
              latitude,
              longitude,
              accuracy: readNumber(locationFields.accuracy),
              timestamp: convertToTimestamp(locationFields.timestamp?.timestampValue),
            };
          }
        }

        const userFields = fields.userInfo?.mapValue?.fields;
        if (userFields) {
          const ageValue = readNumber(userFields.age);
          converted.userInfo = {
            name: userFields.name?.stringValue,
            bloodType: userFields.bloodType?.stringValue,
            age: typeof ageValue === 'number' && Number.isFinite(ageValue) ? Math.round(ageValue) : undefined,
            medicalConditions: readStringArray(userFields.medicalConditions?.arrayValue?.values),
            allergies: readStringArray(userFields.allergies?.arrayValue?.values),
            medications: readStringArray(userFields.medications?.arrayValue?.values),
            notes: userFields.notes?.stringValue,
          };
        }

        return converted;
      } catch (err) {
        console.error('[MapTracker] Error fetching session data via REST API:', err);
        return null;
      }
    },
    [sessionId],
  );

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided.');
      setLoading(false);
      return undefined;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    let pollingId: number | null = null;

    const initialise = async () => {
      try {
        setStatusMessage('Validating access...');

        const urlToken = searchParams.get('token');
        if (urlToken) {
          localStorage.setItem('sos_access_token', urlToken);
        }

        const accessToken = urlToken || localStorage.getItem('sos_access_token');

        if (!accessToken) {
          throw new Error('Missing access token. Please use the complete emergency link.');
        }

        setStatusMessage('Loading map...');
        await ensureMapReady();

        if (!isMounted) return;

        setStatusMessage('Connecting to live updates...');

        const handleIncomingSession = (data: SOSSession | null) => {
          if (!isMounted || !data) return;

          setSession(data);
          updateMapMarker(data);
          setLoading(false);
          setStatusMessage('');
          setError(null);
        };

        if (user) {
          const sessionRef = doc(db, 'sos_sessions', sessionId);
          unsubscribe = onSnapshot(
            sessionRef,
            { includeMetadataChanges: true },
            (snapshot) => {
              if (!snapshot.exists()) {
                setError('SOS session not found or has expired.');
                setLoading(false);
                return;
              }

              const data = snapshot.data() as SOSSession;
              handleIncomingSession(data);
            },
            (err) => {
              console.error('[MapTracker] Error with Firestore listener:', err);
              setError('Error loading SOS session data.');
              setLoading(false);
            },
          );
        } else {
          const poll = async () => {
            const data = await fetchSessionData(accessToken);
            if (!isMounted) return;

            if (data) {
              handleIncomingSession(data);
            } else {
              setError('Unable to load SOS session data.');
            }
          };

          await poll();
          pollingId = window.setInterval(poll, 5000);
        }
      } catch (err) {
        console.error('[MapTracker] Initialisation failure:', err);
        if (!isMounted) return;

        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred while initialising the tracker.';
        setError(message);
        setLoading(false);
        setStatusMessage('');
      }
    };

    initialise();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      if (pollingId) {
        clearInterval(pollingId);
      }
    };
  }, [ensureMapReady, fetchSessionData, searchParams, sessionId, updateMapMarker, user]);

  const formatTimestamp = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp.toMillis()).toLocaleString();
  };

  return (
    <div className="map-tracker-wrapper">
      <header className="map-tracker-header">
        <div>
          <h1>ClimateReady SOS Emergency</h1>
          <p className="map-tracker-subtitle">Live status shared with your trusted responders.</p>
        </div>
        {session?.active === false && <span className="map-tracker-badge">Resolved</span>}
      </header>

      <section className="map-tracker-body">
        <div ref={mapContainerRef} className="map-tracker-map" />

        {(loading || statusMessage) && !error && (
          <div className="map-tracker-overlay" aria-live="polite">
            <div className="map-tracker-overlay-card">
              <div className="spinner" />
              <h2>Preparing map</h2>
              <p>{statusMessage || 'Fetching the latest emergency location...'}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="map-tracker-overlay error" role="alert">
            <div className="map-tracker-overlay-card">
              <h2>We ran into a problem</h2>
              <p>{error}</p>
              <ul>
                <li>Double-check that you opened the full emergency link</li>
                <li>The SOS session may have expired or been closed</li>
                <li>Your internet connection might be unstable</li>
              </ul>
              <button type="button" onClick={() => window.location.reload()} className="map-tracker-retry">
                Try again
              </button>
            </div>
          </div>
        )}
      </section>

      <aside className="map-tracker-info">
        <h2>Emergency details</h2>
        {session ? (
          <>
            <dl>
              {session.userInfo?.name && (
                <div>
                  <dt>Name</dt>
                  <dd>{session.userInfo.name}</dd>
                </div>
              )}
              {typeof session.userInfo?.age === 'number' && (
                <div>
                  <dt>Age</dt>
                  <dd>{session.userInfo.age}</dd>
                </div>
              )}
              {session.userInfo?.bloodType && (
                <div>
                  <dt>Blood type</dt>
                  <dd>{session.userInfo.bloodType}</dd>
                </div>
              )}
              {session.userInfo?.medicalConditions?.length ? (
                <div>
                  <dt>Medical conditions</dt>
                  <dd>{session.userInfo.medicalConditions.join(', ')}</dd>
                </div>
              ) : null}
              {session.userInfo?.allergies?.length ? (
                <div>
                  <dt>Allergies</dt>
                  <dd>{session.userInfo.allergies.join(', ')}</dd>
                </div>
              ) : null}
              {session.userInfo?.medications?.length ? (
                <div>
                  <dt>Medications</dt>
                  <dd>{session.userInfo.medications.join(', ')}</dd>
                </div>
              ) : null}
              {session.userInfo?.notes && (
                <div>
                  <dt>Notes for responders</dt>
                  <dd>{session.userInfo.notes}</dd>
                </div>
              )}
            </dl>

            {session.location && (
              <p className="map-tracker-updated">Last updated: {formatTimestamp(session.location.timestamp)}</p>
            )}
          </>
        ) : (
          <p className="map-tracker-placeholder">We&apos;ll populate emergency details once the session loads.</p>
        )}
      </aside>

      {isDebugMode && <TokenDebugHelper />}
    </div>
  );
};

export default MapTracker;