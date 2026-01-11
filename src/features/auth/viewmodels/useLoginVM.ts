import { create } from 'zustand';
import { signIn, signOut } from '../services/auth.service';
import { LoginCredentials } from '../types/auth.types';
import { parseFirebaseError, logError } from '../../../shared/utils/errors';

interface LoginState {
  loading: boolean;
  error: string | null;
}

interface LoginActions {
  submitLogin: (credentials: LoginCredentials) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

type LoginVM = LoginState & LoginActions;

/**
 * Login ViewModel using Zustand
 * Manages login form state and authentication logic
 */
export const useLoginVM = create<LoginVM>((set) => ({
  // State
  loading: false,
  error: null,

  // Actions
  submitLogin: async (credentials: LoginCredentials) => {
    set({ loading: true, error: null });
    
    try {
      await signIn(credentials);
      set({ loading: false, error: null });
      return true;
    } catch (error: any) {
      const errorMessage = parseFirebaseError(error);
      logError(error, 'Login');
      set({ loading: false, error: errorMessage });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({ loading: false, error: null }),
}));
