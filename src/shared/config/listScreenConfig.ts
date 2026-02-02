import { spacing } from '@/app/theme/theme';
import type { GenericListScreenConfig } from '../components/GenericListScreen';

/**
 * Default configuration for list screens.
 * Provides standardized appearance for all list-based screens.
 * Used by: FaultReportListScreen, AnnouncementsListScreen, and other lists.
 * 
 * This is the single place to manage list appearance.
 */

/** Base configuration applied to all lists */
export const listScreenDefaults: GenericListScreenConfig = {
  showHeader: true,
  showScrollIndicator: false,
  contentPadding: spacing.lg,
  bottomPadding: spacing.xxl,
};

/** Configuration overrides for specific list types */
export const listScreenConfigs = {
  /** Fault Reports list - minimal header, always visible filter */
  faultReports: {
    ...listScreenDefaults,
    headerComponent: null, // No create button
    // filterComponent set dynamically in FaultReportListScreen
  },

  /** Announcements list - conditional header, conditional filter */
  announcements: {
    ...listScreenDefaults,
    // headerComponent set dynamically based on permissions
    // filterComponent set dynamically based on permissions
  },
} as const;

/**
 * Usage:
 * 
 * // In FaultReportListScreen:
 * <GenericListScreen
 *   ...props
 *   config={{
 *     ...listScreenDefaults,
 *     filterComponent: <TFButton ... />,
 *     loadingComponent: <ListLoadingComponent />,
 *     emptyComponent: <Text>{t('faults.noReports')}</Text>,
 *   }}
 * />
 * 
 * // In AnnouncementsListScreen:
 * <GenericListScreen
 *   ...props
 *   config={{
 *     ...listScreenDefaults,
 *     headerComponent: permissions.showCreateButton ? <TFButton /> : null,
 *     filterComponent: permissions.showExpiredToggle ? <TFButton /> : null,
 *     loadingComponent: <ListLoadingComponent size="small" />,
 *     emptyComponent: <Text>{emptyStateMessage}</Text>,
 *   }}
 * />
 */
