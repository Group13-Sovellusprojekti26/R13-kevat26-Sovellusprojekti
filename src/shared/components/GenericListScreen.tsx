import React, { ReactNode } from 'react';
import { View, FlatList, ListRenderItem, RefreshControl, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@/app/theme/theme';

/**
 * Configuration object for controlling GenericListScreen appearance and behavior.
 * Provides a single place to define how lists, filters, buttons, and states are displayed.
 */
export interface GenericListScreenConfig {
  /** Whether to show the create/action button at the top */
  showHeader?: boolean;
  /** Header content (usually a create button) */
  headerComponent?: ReactNode;
  /** Filter button component (if any) */
  filterComponent?: ReactNode;
  /** Loading skeleton component for initial load */
  loadingComponent?: ReactNode;
  /** Empty state component */
  emptyComponent?: ReactNode;
  /** Whether to show vertical scroll indicator */
  showScrollIndicator?: boolean;
  /** Content padding */
  contentPadding?: number;
  /** Bottom padding (for safe area) */
  bottomPadding?: number;
}

interface GenericListScreenProps<T> {
  /** Array of items to display */
  data: T[];
  /** Render function for each item */
  renderItem: ListRenderItem<T>;
  /** Extract unique key for each item */
  keyExtractor: (item: T, index: number) => string;
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Whether data is being refreshed */
  isRefreshing?: boolean;
  /** Whether more data can be loaded (pagination) */
  hasMore?: boolean;
  /** Whether currently loading more items */
  isLoadingMore?: boolean;
  /** Callback for refresh action */
  onRefresh?: () => void;
  /** Callback when reaching end of list (pagination) */
  onEndReached?: () => void;
  /** Configuration object for controlling appearance */
  config?: GenericListScreenConfig;
}

const defaultConfig: GenericListScreenConfig = {
  showHeader: true,
  showScrollIndicator: false,
  contentPadding: spacing.lg,
  bottomPadding: spacing.xxl,
};

const defaultStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 300,
  },
  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});

/**
 * Unified generic list screen component for displaying any type of data in list format.
 * 
 * Provides consistent styling and behavior across all list-based screens:
 * - Header and filter sections
 * - Loading, empty, and error states
 * - Refresh control
 * - Pagination (onEndReached)
 * - Centralized appearance configuration
 * 
 * This component eliminates duplication between FaultReportListScreen and AnnouncementsListScreen,
 * allowing appearance to be managed from a single place.
 * 
 * @template T - Type of items in the list
 * @param props - Component props
 * @returns JSX.Element - The rendered list screen
 * 
 * @example
 * <GenericListScreen
 *   data={items}
 *   renderItem={({ item }) => <ItemCard item={item} />}
 *   keyExtractor={(item) => item.id}
 *   isLoading={loading}
 *   onRefresh={refresh}
 *   config={{
 *     headerComponent: <TFButton title="Create" />,
 *     emptyComponent: <EmptyState />
 *   }}
 * />
 */
export const GenericListScreen = React.forwardRef<FlatList, GenericListScreenProps<any>>(
  (
    {
      data,
      renderItem,
      keyExtractor,
      isLoading = false,
      isRefreshing = false,
      hasMore = false,
      isLoadingMore = false,
      onRefresh,
      onEndReached,
      config = {},
    },
    ref
  ) => {
    const theme = useTheme();
    const mergedConfig = { ...defaultConfig, ...config };

    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[defaultStyles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header component (create button, etc.) */}
        {mergedConfig.showHeader && mergedConfig.headerComponent && (
          <View style={defaultStyles.headerContainer}>
            {mergedConfig.headerComponent}
          </View>
        )}

        {/* Filter component */}
        {mergedConfig.filterComponent && (
          <View style={defaultStyles.filterContainer}>
            {mergedConfig.filterComponent}
          </View>
        )}

        {/* Loading state */}
        {isLoading && !data.length && (
          <View style={defaultStyles.centerContainer}>
            {mergedConfig.loadingComponent}
          </View>
        )}

        {/* List or empty state */}
        {!isLoading && (
          <>
            {data.length > 0 ? (
              <FlatList
                ref={ref}
                data={data}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={mergedConfig.showScrollIndicator}
                contentContainerStyle={[
                  defaultStyles.listContent,
                  {
                    paddingHorizontal: mergedConfig.contentPadding,
                    paddingVertical: mergedConfig.contentPadding,
                    paddingBottom: mergedConfig.bottomPadding,
                  },
                ]}
                refreshControl={
                  onRefresh ? (
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
                  ) : undefined
                }
                onEndReached={() => {
                  if (hasMore && !isLoadingMore && onEndReached) {
                    onEndReached();
                  }
                }}
                ListFooterComponent={
                  isLoadingMore ? (
                    <View style={defaultStyles.loadingContainer}>
                      {mergedConfig.loadingComponent}
                    </View>
                  ) : null
                }
              />
            ) : (
              <View style={defaultStyles.emptyContainer}>
                {mergedConfig.emptyComponent}
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    );
  }
);

GenericListScreen.displayName = 'GenericListScreen';
