/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Parse Firebase error to user-friendly message
 */
export function parseFirebaseError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  const firebaseError = error as { code?: string; message?: string };
  const errorCode = firebaseError?.code || '';
  
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'Email is already registered';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    case 'permission-denied':
      return 'You do not have permission to perform this action';
    case 'not-found':
      return 'The requested resource was not found';
    default:
      return firebaseError?.message || 'An unexpected error occurred';
  }
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: string): void {
  console.error(`[Error${context ? ` - ${context}` : ''}]:`, error);
}
