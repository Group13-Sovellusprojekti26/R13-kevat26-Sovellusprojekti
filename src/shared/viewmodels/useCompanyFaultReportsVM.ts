import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { FaultReport } from '@/data/models/FaultReport';
import { FaultReportStatus } from '@/data/models/enums';
import { getFaultReportsForRole } from '@/data/repositories/faultReports.repo';
import { parseFirebaseError, logError } from '@/shared/utils/errors';
import { createZustandStorage, STORAGE_KEYS } from '@/shared/utils/zustandStorage';

interface CompanyFaultReportsState {
  reports: FaultReport[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  _hasHydrated: boolean;
}

/** Subset of state that gets persisted to AsyncStorage */
interface PersistedCompanyFaultReportsState {
  reports: FaultReport[];
}

interface CompanyFaultReportsActions {
  loadReports: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  clearReports: () => void;
  setHasHydrated: (state: boolean) => void;
}

type CompanyFaultReportsVM = CompanyFaultReportsState & CompanyFaultReportsActions;

/**
 * Company Fault Reports Store
 * 
 * Features:
 * - Persists reports to AsyncStorage for offline access
 * - Shows cached data immediately while refreshing in background
 * - Shared across housing company, maintenance, and service company views
 */
const companyFaultReportsStore = createStore<CompanyFaultReportsVM>()(
  persist(
    (set, get) => ({
      reports: [],
      loading: false,
      error: null,
      refreshing: false,
      _hasHydrated: false,

      loadReports: async () => {
        const hasExistingData = get().reports.length > 0;
        // Only show loading spinner on initial load, otherwise silent refresh
        if (!hasExistingData) {
          set({ loading: true, error: null });
        } else {
          set({ error: null });
        }
        
        try {
          const reports = await getFaultReportsForRole();
          set({ reports, loading: false, refreshing: false, error: null });
        } catch (error: unknown) {
          const errorMessage = parseFirebaseError(error);
          logError(error, 'Load Company Fault Reports');
          set({ loading: false, refreshing: false, error: errorMessage });
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
      name: STORAGE_KEYS.COMPANY_FAULT_REPORTS,
      storage: createZustandStorage<PersistedCompanyFaultReportsState>(),
      // Only persist reports, not transient states
      partialize: (state): PersistedCompanyFaultReportsState => ({
        reports: state.reports,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export const useCompanyFaultReportsVM = <T>(selector: (state: CompanyFaultReportsVM) => T) =>
  useStore(companyFaultReportsStore, selector);

export type FaultReportFilter =
  | 'all'
  | 'open'
  | 'in_progress'
  | 'waiting'
  | 'done'
  | 'failed'
  | 'cancelled';

export const filterReportsByStatus = (
  reports: FaultReport[],
  filter: FaultReportFilter
): FaultReport[] => {
  switch (filter) {
    case 'open':
      return reports.filter(report =>
        report.status === FaultReportStatus.CREATED || report.status === FaultReportStatus.OPEN
      );
    case 'in_progress':
      return reports.filter(report => report.status === FaultReportStatus.IN_PROGRESS);
    case 'waiting':
      return reports.filter(report => report.status === FaultReportStatus.WAITING);
    case 'done':
      return reports.filter(report =>
        report.status === FaultReportStatus.COMPLETED ||
        report.status === FaultReportStatus.RESOLVED ||
        report.status === FaultReportStatus.CLOSED
      );
    case 'failed':
      return reports.filter(report =>
        report.status === FaultReportStatus.INCOMPLETE || report.status === FaultReportStatus.NOT_POSSIBLE
      );
    case 'cancelled':
      return reports.filter(report => report.status === FaultReportStatus.CANCELLED);
    case 'all':
    default:
      return reports;
  }
};
