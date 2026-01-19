import { create } from 'zustand';
import { getCurrentUser } from '../../auth/services/auth.service';
import { HousingCompany, CreateHousingCompanyInput } from '../../../data/models/HousingCompany';
import {
  getHousingCompaniesByAdmin,
  createHousingCompany as createCompany,
  generateInviteCode as genInviteCode,
  deleteHousingCompany,
} from '../../../data/repositories/housingCompanies.repo';
import { AppError } from '../../../shared/utils/errors';

interface AdminState {
  companies: HousingCompany[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadCompanies: () => Promise<void>;
  createCompany: (input: CreateHousingCompanyInput) => Promise<{ id: string }>;
  generateInviteCode: (companyId: string) => Promise<{ inviteCode: string; expiresAt: string }>;
  deleteCompany: (companyId: string) => Promise<void>;
  clearError: () => void;
}

export const useAdminVM = create<AdminState>((set, get) => ({
  companies: [],
  isLoading: false,
  error: null,

  loadCompanies: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = getCurrentUser();
      if (!user) {
        throw new AppError('auth.notAuthenticated');
      }

      const companies = await getHousingCompaniesByAdmin(user.uid);
      set({ companies, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error?.message || 'admin.loadCompaniesError', 
        isLoading: false 
      });
    }
  },

  createCompany: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await createCompany(input);
      
      // Reload companies after creation
      await get().loadCompanies();
      
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || 'admin.createCompanyError';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  generateInviteCode: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await genInviteCode(companyId);
      
      // Reload companies to update invite code
      await get().loadCompanies();
      
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || 'admin.generateInviteError';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  deleteCompany: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteHousingCompany(companyId);
      
      // Reload companies after deletion
      await get().loadCompanies();
    } catch (error: any) {
      const errorMsg = error?.message || 'admin.deleteCompanyError';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));