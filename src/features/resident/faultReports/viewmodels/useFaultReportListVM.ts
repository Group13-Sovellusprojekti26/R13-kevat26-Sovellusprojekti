import { create } from 'zustand';
import { FaultReport } from '../../../../data/models/FaultReport';
import { getFaultReportsForRole } from '../../../../data/repositories/faultReports.repo';
import { getCurrentUser } from '../../../auth/services/auth.service';
import { parseFirebaseError, logError } from '../../../../shared/utils/errors';

interface FaultReportListState {
  reports: FaultReport[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

interface FaultReportListActions {
  loadReports: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

type FaultReportListVM = FaultReportListState & FaultReportListActions;

/**
 * Fault Report List ViewModel
 * Manages the list of fault reports for the current user
 */
export const useFaultReportListVM = create<FaultReportListVM>((set, get) => ({
  // State
  reports: [],
  loading: false,
  error: null,
  refreshing: false,

  // Actions
  loadReports: async () => {
    const user = getCurrentUser();
    if (!user) {
      set({ error: 'Please sign in to view your fault reports.' });
      return;
    }

    set({ loading: true, error: null });

    try {
      const reports = await getFaultReportsForRole();
      set({ reports, loading: false, error: null });
    } catch (error: any) {
      const errorMessage = parseFirebaseError(error);
      logError(error, 'Load Fault Reports');
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
