import { create } from 'zustand';
import { getUserProfile } from '../../../data/repositories/users.repo';
import { UserProfile } from '../../../data/models/UserProfile';

interface ResidentState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadProfile: () => Promise<void>;
  clearError: () => void;
}

export const useResidentVM = create<ResidentState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await getUserProfile();
      set({ profile, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error?.message || 'Failed to load profile', 
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
}));
