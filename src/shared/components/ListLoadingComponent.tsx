import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from 'react-native-paper';
import { spacing } from '@/app/theme/theme';

/**
 * Standardized loading component for lists.
 * Shows a spinner in the center with optional spacing.
 * 
 * Used by GenericListScreen and list-based screens for consistent loading UI.
 */
export const ListLoadingComponent: React.FC<{
  size?: 'small' | 'large';
}> = ({ size = 'large' }) => {
  const theme = useTheme();
  
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.lg,
    }}>
      <ActivityIndicator
        size={size}
        color={theme.colors.primary}
      />
    </View>
  );
};

ListLoadingComponent.displayName = 'ListLoadingComponent';
