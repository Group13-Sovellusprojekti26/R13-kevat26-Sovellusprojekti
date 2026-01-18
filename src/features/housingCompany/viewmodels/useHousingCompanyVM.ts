import { create } from 'zustand';
import {
  ResidentInvite,
  generateResidentInviteCode as genResidentCode,
  getResidentInviteCodes,
  deleteResidentInvite as delResidentInvite,
} from '../../../data/repositories/residentInvites.repo';
import {
  generateManagementInviteCode as genManagementCode,
} from '../../../data/repositories/managementInvites.repo';
import {
  generateServiceCompanyInviteCode as genServiceCompanyCode,
} from '../../../data/repositories/serviceCompanyInvites.repo';
import {
  getManagementUser,
  getServiceCompanyUser,
  removeManagementUser as removeManagement,
  removeServiceCompanyUser as removeServiceCompany,
  ManagementUserResponse,
  ServiceCompanyUserResponse,
} from '../../../data/repositories/partners.repo';

interface HousingCompanyState {
  residentInvites: ResidentInvite[];
  managementUser: ManagementUserResponse | null;
  serviceCompanyUser: ServiceCompanyUserResponse | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadResidentInvites: () => Promise<void>;
  loadManagementUser: () => Promise<void>;
  loadServiceCompanyUser: () => Promise<void>;
  generateResidentInviteCode: (buildingId: string, apartmentNumber: string) => Promise<{
    inviteCode: string;
    expiresAt: string;
    buildingId: string;
    apartmentNumber: string;
  }>;
  generateManagementInviteCode: () => Promise<{
    inviteCode: string;
    expiresAt: string;
  }>;
  generateServiceCompanyInviteCode: () => Promise<{
    inviteCode: string;
    expiresAt: string;
  }>;
  deleteResidentInvite: (inviteId: string) => Promise<void>;
  removeManagementUser: () => Promise<void>;
  removeServiceCompanyUser: () => Promise<void>;
  clearError: () => void;
}

export const useHousingCompanyVM = create<HousingCompanyState>((set, get) => ({
  residentInvites: [],
  managementUser: null,
  serviceCompanyUser: null,
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

  loadManagementUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await getManagementUser();
      set({ managementUser: result, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error?.message || 'housingCompany.management.getError', 
        isLoading: false 
      });
    }
  },

  loadServiceCompanyUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await getServiceCompanyUser();
      set({ serviceCompanyUser: result, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error?.message || 'housingCompany.serviceCompany.getError', 
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

  generateManagementInviteCode: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await genManagementCode();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || 'housingCompany.management.generateError';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  generateServiceCompanyInviteCode: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await genServiceCompanyCode();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || 'housingCompany.serviceCompany.generateError';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  removeManagementUser: async () => {
    set({ isLoading: true, error: null });
    try {
      await removeManagement();
      set({ managementUser: null, isLoading: false });
    } catch (error: any) {
      const errorMsg = error?.message || 'housingCompany.management.removeError';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  removeServiceCompanyUser: async () => {
    set({ isLoading: true, error: null });
    try {
      await removeServiceCompany();
      set({ serviceCompanyUser: null, isLoading: false });
    } catch (error: any) {
      const errorMsg = error?.message || 'housingCompany.serviceCompany.removeError';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
