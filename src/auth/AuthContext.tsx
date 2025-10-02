import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  User
} from 'firebase/auth';
import { app } from '../firebase';

// Define the auth context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createTempUser: (sessionId: string) => Promise<void>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  createTempUser: async () => {}
});

// Generate a random temporary email
const generateTempEmail = (sessionId: string) => {
  return `temp-${sessionId}@tempuser.climatereary.app`;
};

// Generate a random temporary password
const generateTempPassword = () => {
  return Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
};

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth(app);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Sign out
  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Create temporary user for a specific SOS session
  // This function now automatically creates a temporary user for emergency access
  const createTempUser = async (sessionId: string) => {
    setError(null);
    try {
      // If already signed in, return
      if (user) {
        return;
      }

      // Generate temporary credentials based on session ID
      const tempEmail = generateTempEmail(sessionId);
      const tempPassword = generateTempPassword();

      // Generate a session-specific token from the sessionId
      // This makes the login process automatic for emergency contacts
      // while still maintaining some security
      localStorage.setItem('emergency_access_token', sessionId);
      localStorage.setItem('sos_session_id', sessionId);
      
      try {
        // Try signing in with anonymous auth first (simplest for emergency contacts)
        const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
        setUser(userCredential.user);
        
        // Record access time for auditing
        const now = new Date().toISOString();
        localStorage.setItem('emergency_access_time', now);
      } catch (err) {
        // If creation fails (likely because account already exists), try to sign in
        await signInWithEmailAndPassword(auth, tempEmail, tempPassword);
        
        // Record access time for auditing
        const now = new Date().toISOString();
        localStorage.setItem('emergency_access_time', now);
      }
    } catch (err: any) {
      console.error('Error creating temp user:', err);
      setError('Emergency access granted without account - viewing in public mode');
      
      // Even if authentication fails, still allow access in emergency situations
      // by setting a special flag that the map component will recognize
      localStorage.setItem('emergency_public_access', 'true');
      localStorage.setItem('sos_session_id', sessionId);
      
      // Don't throw the error - let the user see the emergency info
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    resetPassword,
    createTempUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};