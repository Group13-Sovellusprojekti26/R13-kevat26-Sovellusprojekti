import { create } from 'zustand';
import { getUserProfile } from '../../../data/repositories/users.repo';

interface MaintenanceProfile {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  role: string;
  housingCompanyId: string;
}

interface MaintenanceState {
  profile: MaintenanceProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadProfile: () => Promise<void>;
  clearError: () => void;
}

export const useMaintenanceVM = create<MaintenanceState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const userProfile = await getUserProfile();
      if (userProfile) {
        set({ 
          profile: {
            email: userProfile.email,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            phone: userProfile.phone,
            companyName: userProfile.companyName,
            role: userProfile.role,
            housingCompanyId: userProfile.housingCompanyId,
          },
          isLoading: false 
        });
      }
    } catch (error: any) {
      set({ 
        error: error?.message || 'common.error', 
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
}));
