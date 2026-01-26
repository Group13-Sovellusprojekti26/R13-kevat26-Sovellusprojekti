import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { FaultReport } from '@/data/models/FaultReport';
import { FaultReportStatus } from '@/data/models/enums';
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
