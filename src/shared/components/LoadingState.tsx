import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { Screen } from './Screen';

interface LoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  errorTitle?: string;
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
});

/**
 * Unified loading and error state component.
 * Displays loading spinner or error message if needed, otherwise renders children.
 * Used throughout the app for consistent loading/error UI.
 * 
 * @component LoadingState
 * @param {boolean} isLoading - Whether data is loading
 * @param {string} [error] - Error message to display (null/undefined = no error)
 * @param {string} [errorTitle] - Optional title for error message
 * @param {React.ReactNode} children - Content to render when not loading/error
 * @returns {JSX.Element}
 * 
 * @example
 * <LoadingState isLoading={loading} error={error}>
 *   <YourContent />
 * </LoadingState>
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  error,
  errorTitle,
  children,
}) => {
  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          {errorTitle && <Text variant="titleMedium">{errorTitle}</Text>}
          <Text variant="bodyMedium" style={{ marginTop: errorTitle ? 8 : 0 }}>
            {error}
          </Text>
        </View>
      </Screen>
    );
  }

  return <>{children}</>;
};
