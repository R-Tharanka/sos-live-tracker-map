// Utility functions for working with Firestore and tokens

import { doc, DocumentReference } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Creates a document reference with token parameter for Firestore security rules
 * This is necessary for public access to SOS sessions without authentication
 * 
 * Our fetch interceptor will automatically add the token parameter to requests
 * to collections that need it, such as sos_sessions
 */
export function getDocumentWithToken(
  collectionPath: string, 
  documentId: string, 
  token?: string | null
): DocumentReference {
  // Store token in localStorage if provided for the interceptor to use
  if (token && !localStorage.getItem('sos_access_token')) {
    localStorage.setItem('sos_access_token', token);
  }
  
  // Return a standard document reference
  // The token parameter will be added by our fetch interceptor
  return doc(db, collectionPath, documentId);
}