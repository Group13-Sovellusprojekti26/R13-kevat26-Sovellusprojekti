import { create } from 'zustand';
import { FaultReport } from '@/data/models/FaultReport';
import { FaultReportStatus } from '@/data/models/enums';
import { getFaultReportById, updateFaultReportStatus, addWorkLog, deleteWorkLog } from '@/data/repositories/faultReports.repo';
import { getUserProfile } from '@/data/repositories/users.repo';
import { UserRole } from '@/data/models/enums';
import { parseFirebaseError, logError } from '@/shared/utils/errors';
import {
  getStatusActionDefinitions,
  StatusActionDefinition,
} from '@/shared/utils/faultReportStatusActions';

interface FaultReportDetailsState {
  report: FaultReport | null;
  loading: boolean;
  updating: boolean;
  addingWorkLog: boolean;
  deletingWorkLog: boolean;
  error: string | null;
  userRole: UserRole | null;
  userId: string | null;
  statusActions: StatusActionDefinition[];
}

interface FaultReportDetailsActions {
  loadReport: (id: string) => Promise<void>;
  loadUserRole: () => Promise<void>;
  updateStatus: (id: string, status: FaultReportStatus) => Promise<void>;
  addWorkLogEntry: (id: string, content: string) => Promise<void>;
  deleteWorkLogEntry: (id: string, workLogId: string) => Promise<void>;
  clearError: () => void;
}

type FaultReportDetailsVM = FaultReportDetailsState & FaultReportDetailsActions;

export const useFaultReportDetailsVM = create<FaultReportDetailsVM>((set, get) => ({
  report: null,
  loading: false,
  updating: false,
  addingWorkLog: false,
  deletingWorkLog: false,
  error: null,
  userRole: null,
  userId: null,
  statusActions: [],

  loadReport: async (id: string) => {
    // Clear previous report immediately to prevent showing stale data
    set({ loading: true, error: null, report: null, statusActions: [] });
    try {
      const report = await getFaultReportById(id);
      const role = get().userRole;
      const userId = get().userId;
      const isOwnerResident = Boolean(
        role === UserRole.RESIDENT && userId && report?.createdByUserId === userId
      );
      const statusActions =
        report ? getStatusActionDefinitions(report.status, role, isOwnerResident) : [];
      set({
        report,
        loading: false,
        error: null,
        statusActions,
      });
    } catch (error: unknown) {
      const message = parseFirebaseError(error);
      logError(error, 'Load Fault Report Details');
      set({
        loading: false,
        error: message,
        statusActions: [],
      });
    }
  },

  loadUserRole: async () => {
    try {
      const profile = await getUserProfile();
      const role = profile?.role ?? null;
      const userId = profile?.id ?? null;
      const report = get().report;
      const isOwnerResident = Boolean(
        role === UserRole.RESIDENT && userId && report?.createdByUserId === userId
      );
      const statusActions =
        report ? getStatusActionDefinitions(report.status, role, isOwnerResident) : [];
      set({
        userRole: role,
        userId,
        statusActions,
      });
    } catch (error: unknown) {
      logError(error, 'Load User Role');
    }
  },

  updateStatus: async (id: string, status: FaultReportStatus) => {
    if (get().updating) {
      return;
    }

    set({ updating: true, error: null });
    try {
      await updateFaultReportStatus(id, status);
      await get().loadReport(id);
      set({ updating: false, error: null });
    } catch (error: unknown) {
      const message = parseFirebaseError(error);
      logError(error, 'Update Fault Report Status');
      set({ updating: false, error: message });
      throw error;
    }
  },

  addWorkLogEntry: async (id: string, content: string) => {
    if (get().addingWorkLog) {
      return;
    }

    set({ addingWorkLog: true, error: null });
    try {
      await addWorkLog(id, content);
      await get().loadReport(id);
      set({ addingWorkLog: false, error: null });
    } catch (error: unknown) {
      const message = parseFirebaseError(error);
      logError(error, 'Add Work Log');
      set({ addingWorkLog: false, error: message });
      throw error;
    }
  },

  deleteWorkLogEntry: async (id: string, workLogId: string) => {
    if (get().deletingWorkLog) {
      return;
    }

    set({ deletingWorkLog: true, error: null });
    try {
      await deleteWorkLog(id, workLogId);
      await get().loadReport(id);
      set({ deletingWorkLog: false, error: null });
    } catch (error: unknown) {
      const message = parseFirebaseError(error);
      logError(error, 'Delete Work Log');
      set({ deletingWorkLog: false, error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));