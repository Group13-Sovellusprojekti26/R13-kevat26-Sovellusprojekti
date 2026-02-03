import { create } from 'zustand';
import { FaultReport } from '@/data/models/FaultReport';
import { getFaultReportsByUser } from '@/data/repositories/faultReports.repo';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { parseFirebaseError, logError } from '@/shared/utils/errors';

interface OwnFaultReportListState {
  reports: FaultReport[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

interface OwnFaultReportListActions {
  loadReports: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

type OwnFaultReportListVM = OwnFaultReportListState & OwnFaultReportListActions;

/**
 * Shared ViewModel for listing own fault reports
 * Shows only reports created by the current user
 * Used by housing company and property manager roles for their own reports
 */
export const useOwnFaultReportListVM = create<OwnFaultReportListVM>((set, get) => ({
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

    const hasExistingData = get().reports.length > 0;
    if (!hasExistingData) {
      set({ loading: true, error: null });
    } else {
      set({ error: null });
    }

    try {
      // getFaultReportsByUser returns only reports created by current user
      const reports = await getFaultReportsByUser();
      set({ reports, loading: false, error: null });
    } catch (error: unknown) {
      const errorMessage = parseFirebaseError(error);
      logError(error, 'Load Own Fault Reports');
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
