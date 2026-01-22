import { create } from 'zustand';
import { FaultReport } from '@/data/models/FaultReport';
import { getFaultReportsForRole } from '@/data/repositories/faultReports.repo';
import { parseFirebaseError, logError } from '@/shared/utils/errors';

interface HousingCompanyFaultReportsState {
  reports: FaultReport[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

interface HousingCompanyFaultReportsActions {
  loadReports: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

type HousingCompanyFaultReportsVM = HousingCompanyFaultReportsState & HousingCompanyFaultReportsActions;

export const useHousingCompanyFaultReportsVM = create<HousingCompanyFaultReportsVM>((set, get) => ({
  reports: [],
  loading: false,
  error: null,
  refreshing: false,

  loadReports: async () => {
    set({ loading: true, error: null });
    try {
      console.log('HousingCompanyFaultReportsVM loadReports called');
      const reports = await getFaultReportsForRole();
      console.log('HousingCompanyFaultReportsVM', {
        returnedCount: reports.length,
      });
      set({ reports, loading: false, error: null });
    } catch (error: unknown) {
      const errorMessage = parseFirebaseError(error);
      logError(error, 'Load Housing Company Fault Reports');
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
