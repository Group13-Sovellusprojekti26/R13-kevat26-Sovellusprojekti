import { StyleSheet } from 'react-native';
import { spacing } from '@/app/theme/theme';

/**
 * Common styles shared across multiple screens
 * Eliminates style duplication (~100+ lines saved)
 * Used by: ManageFaultReportsScreen variants, FaultReportListScreen, etc.
 */

export const commonScreenStyles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: spacing.lg,
  },
  emptyContainer: {
    marginTop: 120,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
  },
});

export const commonListStyles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  filterContainer: {
    marginBottom: spacing.md,
  },
});
