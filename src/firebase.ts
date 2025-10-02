// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration
// Use environment variables to secure Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase with configuration to support token validation
// Using REST API settings for queryParameterEncoding which our interceptor handles
const firebaseAppConfig = {
  ...firebaseConfig,
  // These settings are crucial for the token-based access to work properly
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
};

export const app = initializeApp(firebaseAppConfig);

// Configure Firestore with settings that help with token handling
export const db = getFirestore(app);

// Initialize authentication
export const auth = getAuth(app);

export default { app, db, auth };