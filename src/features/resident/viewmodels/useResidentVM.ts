import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deleteResidentAccount, getUserProfile } from '../../../data/repositories/users.repo';
import { UserProfile } from '../../../data/models/UserProfile';
import { signOut } from '../../auth/services/auth.service';
import { createZustandStorage, STORAGE_KEYS } from '../../../shared/utils/zustandStorage';

interface ResidentState {
  profile: UserProfile | null;
  isLoading: boolean;
  isDeleting: boolean;
  error: string | null;
  _hasHydrated: boolean;
  
  // Actions
  loadProfile: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
  clearProfile: () => void;
  setHasHydrated: (state: boolean) => void;
}

/**
 * Resident ViewModel
 * Manages user profile state with persistence
 * 
 * Features:
 * - Persists profile to AsyncStorage
 * - Shows cached profile immediately on app start
 * - Refreshes profile data in background
 */
export const useResidentVM = create<ResidentState>()(
  persist(
    (set) => ({
      profile: null,
      isLoading: false,
      isDeleting: false,
      error: null,
      _hasHydrated: false,

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
      
      clearProfile: () => set({ profile: null, error: null }),
      
      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
    }),
    {
      name: STORAGE_KEYS.USER_PROFILE,
      storage: createZustandStorage<ResidentState>(),
      // Only persist profile data
      partialize: (state) => ({
        profile: state.profile,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
