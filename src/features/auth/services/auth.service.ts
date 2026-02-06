import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from '../../../data/firebase/firebase';
import { LoginCredentials } from '../types/auth.types';
import { AppError, logError } from '../../../shared/utils/errors';
import { clearPersistedUserData } from '../../../shared/utils/zustandStorage';

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
  } catch (error: any) {
    logError(error, 'Sign in');
    throw new AppError('auth.loginError', error?.code, error);
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
  } catch (error: any) {
    logError(error, 'Sign up');
    throw new AppError('auth.signupError', error?.code, error);
  }
}

/**
 * Sign out current user
 * Clears all persisted user data to prevent data leakage
 */
export async function signOut(): Promise<void> {
  try {
    // Clear persisted user data before signing out
    await clearPersistedUserData();
    await firebaseSignOut(auth);
  } catch (error: any) {
    logError(error, 'Sign out');
    throw new AppError('auth.signoutError', error?.code, error);
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
