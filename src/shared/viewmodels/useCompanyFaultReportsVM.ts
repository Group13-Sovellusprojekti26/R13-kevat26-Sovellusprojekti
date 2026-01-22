import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { FaultReport } from '@/data/models/FaultReport';
import { getFaultReportsForRole } from '@/data/repositories/faultReports.repo';
import { parseFirebaseError, logError } from '@/shared/utils/errors';

interface CompanyFaultReportsState {
  reports: FaultReport[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

interface CompanyFaultReportsActions {
  loadReports: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

type CompanyFaultReportsVM = CompanyFaultReportsState & CompanyFaultReportsActions;

const companyFaultReportsStore = createStore<CompanyFaultReportsVM>((set, get) => ({
  reports: [],
  loading: false,
  error: null,
  refreshing: false,

  loadReports: async () => {
    set({ loading: true, error: null });
    try {
      console.log('useCompanyFaultReportsVM loadReports called');
      const reports = await getFaultReportsForRole();
      console.log('useCompanyFaultReportsVM reports loaded', {
        count: reports.length,
      });
      set({ reports, loading: false, error: null });
    } catch (error: unknown) {
      const errorMessage = parseFirebaseError(error);
      logError(error, 'Load Company Fault Reports');
      set({ loading: false, error: errorMessage });
    }
  },

  refresh: async () => {
    set({ refreshing: true });
    await get().loadReports();
    set({ refreshing: false });
  },

  clearError: () => set({ error: null }),
}));

export const useCompanyFaultReportsVM = <T>(selector: (state: CompanyFaultReportsVM) => T) =>
  useStore(companyFaultReportsStore, selector);
