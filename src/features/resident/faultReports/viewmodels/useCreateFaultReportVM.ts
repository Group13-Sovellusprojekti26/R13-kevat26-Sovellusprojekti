import { create } from 'zustand';
import { CreateFaultReportInput } from '../../../../data/models/FaultReport';
import { UrgencyLevel } from '../../../../data/models/enums';
import { createFaultReport } from '../../../../data/repositories/faultReports.repo';
import { getCurrentUser } from '../../../auth/services/auth.service';
import { parseFirebaseError, logError } from '../../../../shared/utils/errors';

interface CreateFaultReportState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface CreateFaultReportActions {
  submitReport: (input: CreateFaultReportInput) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

type CreateFaultReportVM = CreateFaultReportState & CreateFaultReportActions;

/**
 * Create Fault Report ViewModel
 * Manages the creation of new fault reports
 */
export const useCreateFaultReportVM = create<CreateFaultReportVM>((set) => ({
  // State
  loading: false,
  error: null,
  success: false,

  // Actions
  submitReport: async (input: CreateFaultReportInput) => {
    const user = getCurrentUser();
    if (!user) {
      set({ error: 'User not authenticated' });
      return false;
    }

    set({ loading: true, error: null, success: false });

    try {
      await createFaultReport(user.uid, input);
      set({ loading: false, error: null, success: true });
      return true;
    } catch (error: any) {
      const errorMessage = parseFirebaseError(error);
      logError(error, 'Create Fault Report');
      set({ loading: false, error: errorMessage, success: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({ loading: false, error: null, success: false }),
}));
