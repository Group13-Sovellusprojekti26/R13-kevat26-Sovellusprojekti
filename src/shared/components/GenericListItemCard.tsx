import React, { ReactNode } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import { spacing } from '@/app/theme/theme';

/**
 * Configuration for GenericListItemCard appearance and behavior.
 */
export interface GenericListItemCardConfig {
  /** Horizontal padding inside card */
  horizontalPadding?: number;
  /** Vertical padding inside card */
  verticalPadding?: number;
  /** Margin bottom between cards */
  marginBottom?: number;
  /** Whether to show elevation/shadow */
  showElevation?: boolean;
  /** Border radius */
  borderRadius?: number;
}

interface GenericListItemCardProps<T> {
  /** Data item to display */
  item: T;
  /** Render function for card content */
  renderContent: (item: T) => ReactNode;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Optional configuration */
  config?: GenericListItemCardConfig;
}

const defaultConfig: GenericListItemCardConfig = {
  horizontalPadding: spacing.md,
  verticalPadding: spacing.md,
  marginBottom: spacing.md,
  showElevation: true,
  borderRadius: 8,
};

/**
 * Generic list item card component for standardized card appearance across all lists.
 * 
 * Ensures all list items (fault reports, announcements, etc.) have consistent:
 * - Padding and spacing
 * - Elevation and shadows
 * - Border radius
 * - Touch feedback
 * 
 * Content rendering is customizable via renderContent prop.
 * 
 * @template T - Type of item being displayed
 * @param props - Component props
 * @returns JSX.Element - The rendered card
 * 
 * @example
 * <GenericListItemCard
 *   item={faultReport}
 *   renderContent={(item) => (
 *     <View>
 *       <Text>{item.title}</Text>
 *       <Chip>{item.status}</Chip>
 *     </View>
 *   )}
 *   onPress={() => navigation.navigate('Details')}
 * />
 */
export const GenericListItemCard = React.forwardRef<View, GenericListItemCardProps<any>>(
  ({ item, renderContent, onPress, config = {} }, ref) => {
    const theme = useTheme();
    const mergedConfig = { ...defaultConfig, ...config };

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          marginBottom: mergedConfig.marginBottom,
        })}
      >
        <Card
          ref={ref}
          style={{
            borderRadius: mergedConfig.borderRadius,
            backgroundColor: theme.colors.surface,
          }}
          elevation={mergedConfig.showElevation ? 1 : 0}
        >
          <View
            style={{
              paddingHorizontal: mergedConfig.horizontalPadding,
              paddingVertical: mergedConfig.verticalPadding,
            }}
          >
            {renderContent(item)}
          </View>
        </Card>
      </Pressable>
    );
  }
);

GenericListItemCard.displayName = 'GenericListItemCard';
