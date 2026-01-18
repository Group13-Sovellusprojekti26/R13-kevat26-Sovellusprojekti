import { create } from 'zustand';
import {
  ResidentInvite,
  generateResidentInviteCode as genResidentCode,
  getResidentInviteCodes,
  deleteResidentInvite as delResidentInvite,
} from '../../../data/repositories/residentInvites.repo';

interface HousingCompanyState {
  residentInvites: ResidentInvite[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadResidentInvites: () => Promise<void>;
  generateResidentInviteCode: (buildingId: string, apartmentNumber: string) => Promise<{
    inviteCode: string;
    expiresAt: string;
    buildingId: string;
    apartmentNumber: string;
  }>;
  deleteResidentInvite: (inviteId: string) => Promise<void>;
  clearError: () => void;
}

export const useHousingCompanyVM = create<HousingCompanyState>((set, get) => ({
  residentInvites: [],
  isLoading: false,
  error: null,

  loadResidentInvites: async () => {
    set({ isLoading: true, error: null });
    try {
      const invites = await getResidentInviteCodes();
      set({ residentInvites: invites, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error?.message || 'housingCompany.residents.generateError', 
        isLoading: false 
      });
    }
  },

  generateResidentInviteCode: async (buildingId: string, apartmentNumber: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await genResidentCode(buildingId, apartmentNumber);
      
      // Reload invites after creation
      await get().loadResidentInvites();
      
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || 'housingCompany.residents.generateError';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  deleteResidentInvite: async (inviteId: string) => {
    set({ isLoading: true, error: null });
    try {
      await delResidentInvite(inviteId);
      
      // Reload invites after deletion
      await get().loadResidentInvites();
      
      set({ isLoading: false });
    } catch (error: any) {
      const errorMsg = error?.message || 'housingCompany.residents.deleteError';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
