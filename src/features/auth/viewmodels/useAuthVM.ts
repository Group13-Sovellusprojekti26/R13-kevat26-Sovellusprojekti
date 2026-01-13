import { create } from 'zustand';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../../data/firebase/firebase';

interface AuthState {
  authReady: boolean;
  user: User | null;
}

interface AuthActions {
  startAuthListener: () => () => void;
  reset: () => void;
}

type AuthVM = AuthState & AuthActions;

export const useAuthVM = create<AuthVM>((set) => ({
  authReady: false,
  user: null,

  startAuthListener: () => {
    const unsub = onAuthStateChanged(auth, (user) => {
      set({ user, authReady: true });
    });
    return unsub;
  },

  reset: () => set({ authReady: false, user: null }),
}));
