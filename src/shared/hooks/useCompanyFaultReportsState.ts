import { useCompanyFaultReportsVM } from '@/shared/viewmodels/useCompanyFaultReportsVM';

/**
 * Custom hook to centralize Zustand selectors for company fault reports
 * Eliminates code duplication across 4 ManageFaultReportsScreen versions
 * 
 * @returns Centralized state and actions from useCompanyFaultReportsVM
 */
export const useCompanyFaultReportsState = () => ({
  reports: useCompanyFaultReportsVM(state => state.reports),
  loading: useCompanyFaultReportsVM(state => state.loading),
  error: useCompanyFaultReportsVM(state => state.error),
  refreshing: useCompanyFaultReportsVM(state => state.refreshing),
  loadReports: useCompanyFaultReportsVM(state => state.loadReports),
  refresh: useCompanyFaultReportsVM(state => state.refresh),
});
