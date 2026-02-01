import { StyleSheet } from 'react-native';
import { spacing } from '@/app/theme/theme';

/**
 * Unified styles for generic list screens (fault reports, announcements, etc.)
 * Provides a single place to manage appearance of all list-based screens
 * Used by: GenericListScreen, FaultReportListScreen, AnnouncementsListScreen
 * 
 * This centralized styling eliminates duplication and makes it easy to:
 * - Update appearance across all lists at once
 * - Maintain consistency between different list types
 * - Add new list-based screens with consistent styling
 */

export const genericListScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header section (create buttons, etc.)
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  // Filter section
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  // Main list content
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Loading state
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 300,
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
  },

  // Pagination footer
  paginationFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
