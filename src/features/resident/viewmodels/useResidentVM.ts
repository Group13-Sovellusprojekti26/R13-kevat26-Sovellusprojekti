import { create } from 'zustand';
import { deleteResidentAccount, getUserProfile } from '../../../data/repositories/users.repo';
import { UserProfile } from '../../../data/models/UserProfile';
import { signOut } from '../../auth/services/auth.service';

interface ResidentState {
  profile: UserProfile | null;
  isLoading: boolean;
  isDeleting: boolean;
  error: string | null;
  
  // Actions
  loadProfile: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

export const useResidentVM = create<ResidentState>((set) => ({
  profile: null,
  isLoading: false,
  isDeleting: false,
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

  deleteAccount: async () => {
    set({ isDeleting: true, error: null });
    try {
      await deleteResidentAccount();
      await signOut();
      set({ isDeleting: false, profile: null });
    } catch (error: any) {
      set({
        error: error?.message || 'Failed to delete account',
        isDeleting: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
