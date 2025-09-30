import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
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
  const createTempUser = async (sessionId: string) => {
    setError(null);
    try {
      // If already signed in, return
      if (user) {
        return;
      }

      // Generate temporary credentials
      const tempEmail = generateTempEmail(sessionId);
      const tempPassword = generateTempPassword();

      try {
        // Try to sign in first (in case this is a returning visitor with a temp account)
        await signInWithEmailAndPassword(auth, tempEmail, tempPassword);
      } catch (err) {
        // If sign in fails, create a new temp account
        const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
        
        // Store the session ID in local storage
        localStorage.setItem('sos_session_id', sessionId);
        
        // If a user was created anonymously before, link the accounts
        if (auth.currentUser && auth.currentUser.isAnonymous) {
          const credential = EmailAuthProvider.credential(tempEmail, tempPassword);
          await linkWithCredential(auth.currentUser, credential);
        }
        
        setUser(userCredential.user);
      }
    } catch (err: any) {
      console.error('Error creating temp user:', err);
      setError(err.message);
      throw err;
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