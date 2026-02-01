import type { FaultReportFilter } from '@/shared/viewmodels/useCompanyFaultReportsVM';

/**
 * Get i18n translation key for filter label
 * Centralizes filter label logic to eliminate 4x code duplication
 * 
 * @param filter - Filter value
 * @param t - Translation function from useTranslation hook
 * @returns Localized filter label string
 */
export const getFaultReportFilterLabel = (filter: FaultReportFilter, t: (key: string) => string): string => {
  switch (filter) {
    case 'open':
      return t('faults.filters.open');
    case 'in_progress':
      return t('faults.filters.inProgress');
    case 'waiting':
      return t('faults.filters.waiting');
    case 'done':
      return t('faults.filters.done');
    case 'failed':
      return t('faults.filters.failed');
    case 'cancelled':
      return t('faults.filters.cancelled');
    case 'all':
    default:
      return t('faults.filters.all');
  }
};
