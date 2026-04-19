/* src/firebase/auth.ts */

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from './config';

// Type for the callback function
type AuthStateCallback = (user: User | null) => void;

/**
 * Listens for changes to the authentication state.
 * @param callback The function to call when the auth state changes.
 * @returns The unsubscribe function from Firebase.
 */
export const onAuthChange = (callback: AuthStateCallback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Signs in a user with their email and password.
 * @param email The user's email.
 * @param password The user's password.
 * @returns A promise that resolves on successful sign-in.
 */
export const signIn = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Signs out the current user.
 * @returns A promise that resolves on successful sign-out.
 */
export const signOutUser = () => {
  return signOut(auth);
};