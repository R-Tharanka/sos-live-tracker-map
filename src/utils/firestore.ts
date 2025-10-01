// Utility functions for working with Firestore and tokens

import { doc, DocumentReference } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Creates a document reference with token parameter for Firestore security rules
 * This is necessary for public access to SOS sessions without authentication
 */
export function getDocumentWithToken(
  collectionPath: string, 
  documentId: string, 
  token?: string | null
): DocumentReference {
  // The standard Firebase JS SDK doesn't directly support attaching URL parameters
  // to Firestore requests like the REST API does. 
  
  // In a production environment, we would use a server-side proxy or custom fetch
  // implementation to attach these parameters.
  
  // For now, we return a standard document reference
  // The token parameter is used in the REST query as configured in firebase.ts
  return doc(db, collectionPath, documentId);
}