import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FaultReport } from '../../../../data/models/FaultReport';
import { getFaultReportsForRole } from '../../../../data/repositories/faultReports.repo';
import { getCurrentUser } from '../../../auth/services/auth.service';
import { parseFirebaseError, logError } from '../../../../shared/utils/errors';
import { createZustandStorage, STORAGE_KEYS } from '../../../../shared/utils/zustandStorage';

interface FaultReportListState {
  reports: FaultReport[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  _hasHydrated: boolean;
}

/** Subset of state that gets persisted */
interface PersistedFaultReportListState {
  reports: FaultReport[];
}

interface FaultReportListActions {
  loadReports: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  clearReports: () => void;
  setHasHydrated: (state: boolean) => void;
}

type FaultReportListVM = FaultReportListState & FaultReportListActions;

/**
 * Fault Report List ViewModel
 * Manages the list of fault reports for the current user
 * 
 * Features:
 * - Persists reports to AsyncStorage for offline access
 * - Shows cached data immediately while refreshing
 * - Handles hydration state for initial load
 */
export const useFaultReportListVM = create<FaultReportListVM>()(
  persist(
    (set, get) => ({
      // State
      reports: [],
      loading: false,
      error: null,
      refreshing: false,
      _hasHydrated: false,

      // Actions
      loadReports: async () => {
        const user = getCurrentUser();
        if (!user) {
          set({ error: 'Please sign in to view your fault reports.' });
          return;
        }

        const hasExistingData = get().reports.length > 0;
        // Only show loading spinner on initial load (no cached data)
        if (!hasExistingData) {
          set({ loading: true, error: null });
        } else {
          set({ error: null });
        }

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
      
      clearReports: () => set({ reports: [], error: null }),
      
      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
    }),
    {
      name: STORAGE_KEYS.FAULT_REPORTS,
      storage: createZustandStorage<PersistedFaultReportListState>(),
      // Only persist reports, not loading/error/refreshing states
      partialize: (state): PersistedFaultReportListState => ({
        reports: state.reports,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
