import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from '../../../data/firebase/firebase';
import { LoginCredentials } from '../types/auth.types';

/**
 * Sign in with email and password
 */
export async function signIn(credentials: LoginCredentials): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    return userCredential;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(credentials: LoginCredentials): Promise<UserCredential> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    return userCredential;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
