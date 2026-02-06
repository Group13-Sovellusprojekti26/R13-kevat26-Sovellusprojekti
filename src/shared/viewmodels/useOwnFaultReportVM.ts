import { create } from 'zustand';
import { CreateFaultReportInput, FaultReport } from '@/data/models/FaultReport';
import { UrgencyLevel, UserRole } from '@/data/models/enums';
import {
  closeFaultReport,
  createFaultReport,
  getFaultReportById,
  updateFaultReportDetails,
} from '@/data/repositories/faultReports.repo';
import { getUserProfile } from '@/data/repositories/users.repo';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { parseFirebaseError, logError } from '@/shared/utils/errors';

interface OwnFaultReportState {
  loading: boolean;
  error: string | null;
  success: boolean;
  report: FaultReport | null;
  fetching: boolean;
  userRole: UserRole | null;
}

interface OwnFaultReportActions {
  submitReport: (input: CreateFaultReportInput) => Promise<boolean>;
  loadReport: (id: string) => Promise<void>;
  updateReport: (params: {
    id: string;
    description?: string;
    imageUris?: string[];
    existingImageUrls?: string[];
    allowMasterKeyAccess?: boolean;
    hasPets?: boolean;
  }) => Promise<boolean>;
  closeReport: (id: string) => Promise<boolean>;
  loadUserRole: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

type OwnFaultReportVM = OwnFaultReportState & OwnFaultReportActions;

/**
 * Shared ViewModel for creating and managing own fault reports
 * Used by housing company and property manager roles
 * Each user can only create, edit, and close their own fault reports
 */
export const useOwnFaultReportVM = create<OwnFaultReportVM>((set, get) => ({
  // State
  loading: false,
  error: null,
  success: false,
  report: null,
  fetching: false,
  userRole: null,

  // Actions
  submitReport: async (input) => {
    const user = getCurrentUser();
    if (!user) {
      set({ error: 'User not authenticated' });
      return false;
    }

    set({ loading: true, error: null, success: false });

    try {
      await createFaultReport(input);
      set({ loading: false, success: true });
      return true;
    } catch (error: unknown) {
      set({
        loading: false,
        error: parseFirebaseError(error),
        success: false,
      });
      return false;
    }
  },

  loadReport: async (id: string) => {
    set({ fetching: true, error: null });

    try {
      const report = await getFaultReportById(id);
      
      // Verify user owns this report
      const user = getCurrentUser();
      if (report && user && report.createdByUserId !== user.uid) {
        set({ fetching: false, error: 'faults.unauthorized', report: null });
        return;
      }
      
      set({ report, fetching: false });
    } catch (error: unknown) {
      const message = parseFirebaseError(error);
      logError(error, 'Load Own Fault Report');
      set({ fetching: false, error: message });
    }
  },

  updateReport: async ({ id, description, imageUris, existingImageUrls, allowMasterKeyAccess, hasPets }) => {
    if (get().loading) {
      return false;
    }
    const user = getCurrentUser();
    if (!user) {
      set({ error: 'User not authenticated' });
      return false;
    }

    // Verify user owns this report
    const currentReport = get().report;
    if (currentReport && currentReport.createdByUserId !== user.uid) {
      set({ error: 'faults.unauthorized' });
      return false;
    }

    set({ loading: true, error: null, success: false });

    try {
      await updateFaultReportDetails(id, {
        description,
        imageUris,
        existingImageUrls,
        allowMasterKeyAccess,
        hasPets,
      });
      set({ loading: false, success: true });
      return true;
    } catch (error: unknown) {
      set({
        loading: false,
        error: parseFirebaseError(error),
        success: false,
      });
      return false;
    }
  },

  closeReport: async (id: string) => {
    const user = getCurrentUser();
    if (!user) {
      set({ error: 'User not authenticated' });
      return false;
    }

    // Verify user owns this report
    const currentReport = get().report;
    if (currentReport && currentReport.createdByUserId !== user.uid) {
      set({ error: 'faults.unauthorized' });
      return false;
    }

    set({ loading: true, error: null, success: false });

    try {
      await closeFaultReport(id);
      set({ loading: false, success: true, report: null });
      return true;
    } catch (error: unknown) {
      set({
        loading: false,
        error: parseFirebaseError(error),
        success: false,
      });
      return false;
    }
  },

  loadUserRole: async () => {
    try {
      const profile = await getUserProfile();
      set({ userRole: profile?.role ?? null });
    } catch (error: unknown) {
      logError(error, 'Load User Role');
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      loading: false,
      error: null,
      success: false,
      report: null,
      fetching: false,
    }),
}));
