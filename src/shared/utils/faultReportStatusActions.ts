import { FaultReportStatus, UserRole } from '@/data/models/enums';

export type StatusActionDefinition = {
  status: FaultReportStatus;
  labelKey: string;
  mode: 'contained' | 'outlined';
  destructive?: boolean;
  tone?: 'warning';
  confirmTitleKey?: string;
  confirmBodyKey?: string;
};

const WORKFLOW_ROLES: UserRole[] = [
  UserRole.HOUSING_COMPANY,
  UserRole.SERVICE_COMPANY,
  UserRole.MAINTENANCE,
  UserRole.ADMIN,
];

export const isWorkflowRole = (role: UserRole | null): boolean => {
  return role !== null && WORKFLOW_ROLES.includes(role);
};

const TRANSITIONS: Record<FaultReportStatus, FaultReportStatus[]> = {
  [FaultReportStatus.CREATED]: [FaultReportStatus.OPEN, FaultReportStatus.CANCELLED],
  [FaultReportStatus.OPEN]: [
    FaultReportStatus.IN_PROGRESS,
    FaultReportStatus.WAITING,
    FaultReportStatus.CANCELLED,
  ],
  [FaultReportStatus.WAITING]: [FaultReportStatus.IN_PROGRESS, FaultReportStatus.CANCELLED],
  [FaultReportStatus.IN_PROGRESS]: [
    FaultReportStatus.WAITING,
    FaultReportStatus.COMPLETED,
    FaultReportStatus.INCOMPLETE,
    FaultReportStatus.NOT_POSSIBLE,
  ],
  [FaultReportStatus.COMPLETED]: [],
  [FaultReportStatus.INCOMPLETE]: [],
  [FaultReportStatus.NOT_POSSIBLE]: [],
  [FaultReportStatus.CANCELLED]: [],
  [FaultReportStatus.RESOLVED]: [],
  [FaultReportStatus.CLOSED]: [],
};

export const normalizeForTransition = (status: FaultReportStatus): FaultReportStatus => {
  if (status === FaultReportStatus.RESOLVED || status === FaultReportStatus.CLOSED) {
    return FaultReportStatus.COMPLETED;
  }
  return status;
};

export const getAllowedNextStatuses = (
  currentStatus: FaultReportStatus,
  role: UserRole | null,
  isOwnerResident: boolean
): FaultReportStatus[] => {
  const normalized = normalizeForTransition(currentStatus);
  const next = TRANSITIONS[normalized] ?? [];

  if (isWorkflowRole(role)) {
    return next;
  }

  if (role === UserRole.RESIDENT && isOwnerResident) {
    return next.filter(status => status === FaultReportStatus.CANCELLED);
  }

  return [];
};

export const getStatusActionDefinitions = (
  currentStatus: FaultReportStatus,
  role: UserRole | null,
  isOwnerResident: boolean
): StatusActionDefinition[] => {
  const allowed = new Set(getAllowedNextStatuses(currentStatus, role, isOwnerResident));
  const normalized = normalizeForTransition(currentStatus);
  const actions: StatusActionDefinition[] = [];

  if (normalized === FaultReportStatus.CREATED) {
    if (allowed.has(FaultReportStatus.OPEN)) {
      actions.push({
        status: FaultReportStatus.OPEN,
        labelKey: 'faults.statusActions.open',
        mode: 'contained',
      });
    }
    if (allowed.has(FaultReportStatus.CANCELLED)) {
      actions.push({
        status: FaultReportStatus.CANCELLED,
        labelKey: 'faults.statusActions.cancel',
        mode: 'outlined',
        destructive: true,
        confirmTitleKey: 'faults.statusConfirm.title',
        confirmBodyKey: 'faults.statusConfirm.cancelBody',
      });
    }
  }

  if (normalized === FaultReportStatus.OPEN) {
    if (allowed.has(FaultReportStatus.IN_PROGRESS)) {
      actions.push({
        status: FaultReportStatus.IN_PROGRESS,
        labelKey: 'faults.statusActions.startWork',
        mode: 'contained',
      });
    }
    if (allowed.has(FaultReportStatus.WAITING)) {
      actions.push({
        status: FaultReportStatus.WAITING,
        labelKey: 'faults.statusActions.moveToQueue',
        mode: 'outlined',
      });
    }
    if (allowed.has(FaultReportStatus.CANCELLED)) {
      actions.push({
        status: FaultReportStatus.CANCELLED,
        labelKey: 'faults.statusActions.cancel',
        mode: 'outlined',
        destructive: true,
        confirmTitleKey: 'faults.statusConfirm.title',
        confirmBodyKey: 'faults.statusConfirm.cancelBody',
      });
    }
  }

  if (normalized === FaultReportStatus.WAITING) {
    if (allowed.has(FaultReportStatus.IN_PROGRESS)) {
      actions.push({
        status: FaultReportStatus.IN_PROGRESS,
        labelKey: 'faults.statusActions.resumeWork',
        mode: 'contained',
      });
    }
    if (allowed.has(FaultReportStatus.CANCELLED)) {
      actions.push({
        status: FaultReportStatus.CANCELLED,
        labelKey: 'faults.statusActions.cancel',
        mode: 'outlined',
        destructive: true,
        confirmTitleKey: 'faults.statusConfirm.title',
        confirmBodyKey: 'faults.statusConfirm.cancelBody',
      });
    }
  }

  if (normalized === FaultReportStatus.IN_PROGRESS) {
    if (allowed.has(FaultReportStatus.WAITING)) {
      actions.push({
        status: FaultReportStatus.WAITING,
        labelKey: 'faults.statusActions.moveToQueue',
        mode: 'outlined',
      });
    }
    if (allowed.has(FaultReportStatus.COMPLETED)) {
      actions.push({
        status: FaultReportStatus.COMPLETED,
        labelKey: 'faults.statusActions.markCompleted',
        mode: 'contained',
      });
    }
    if (allowed.has(FaultReportStatus.INCOMPLETE)) {
      actions.push({
        status: FaultReportStatus.INCOMPLETE,
        labelKey: 'faults.statusActions.markIncomplete',
        mode: 'outlined',
        tone: 'warning',
      });
    }
    if (allowed.has(FaultReportStatus.NOT_POSSIBLE)) {
      actions.push({
        status: FaultReportStatus.NOT_POSSIBLE,
        labelKey: 'faults.statusActions.markNotPossible',
        mode: 'outlined',
        destructive: true,
        confirmTitleKey: 'faults.statusConfirm.title',
        confirmBodyKey: 'faults.statusConfirm.notPossibleBody',
      });
    }
  }

  return actions;
};

export const getStatusLabelKey = (status: FaultReportStatus): string => {
  switch (status) {
    case FaultReportStatus.CREATED:
      return 'faults.status.created';
    case FaultReportStatus.OPEN:
      return 'faults.status.open';
    case FaultReportStatus.IN_PROGRESS:
      return 'faults.status.inProgress';
    case FaultReportStatus.WAITING:
      return 'faults.status.waiting';
    case FaultReportStatus.COMPLETED:
      return 'faults.status.completed';
    case FaultReportStatus.INCOMPLETE:
      return 'faults.status.incomplete';
    case FaultReportStatus.NOT_POSSIBLE:
      return 'faults.status.notPossible';
    case FaultReportStatus.CANCELLED:
      return 'faults.status.cancelled';
    case FaultReportStatus.RESOLVED:
      return 'faults.status.resolved';
    case FaultReportStatus.CLOSED:
      return 'faults.status.closed';
    default:
      return 'faults.status.open';
  }
};

export const isOpenStatus = (status: FaultReportStatus): boolean => {
  return [
    FaultReportStatus.CREATED,
    FaultReportStatus.OPEN,
    FaultReportStatus.IN_PROGRESS,
    FaultReportStatus.WAITING,
  ].includes(status);
};

export const isClosedStatus = (status: FaultReportStatus): boolean => {
  return [
    FaultReportStatus.COMPLETED,
    FaultReportStatus.INCOMPLETE,
    FaultReportStatus.NOT_POSSIBLE,
    FaultReportStatus.CANCELLED,
    FaultReportStatus.RESOLVED,
    FaultReportStatus.CLOSED,
  ].includes(status);
};
