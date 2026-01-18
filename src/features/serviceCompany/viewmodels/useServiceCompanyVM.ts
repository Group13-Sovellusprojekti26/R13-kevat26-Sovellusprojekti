import { create } from 'zustand';
import { getUserProfile } from '../../../data/repositories/users.repo';
import type { UserProfile } from '../../../data/models/UserProfile';
import { AppError } from '../../../shared/utils/errors';

interface ServiceCompanyState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadProfile: () => Promise<void>;
  reset: () => void;
}

export const useServiceCompanyVM = create<ServiceCompanyState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await getUserProfile();
      set({ profile, isLoading: false });
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'profile.loadError';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  reset: () => {
    set({ profile: null, isLoading: false, error: null });
  },
}));
