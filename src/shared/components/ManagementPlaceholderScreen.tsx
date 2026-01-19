import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { Screen } from '@/shared/components/Screen';

interface ManagementPlaceholderScreenProps {
  title: string;
  message: string;
}

/**
 * Generic placeholder screen for management sections
 */
export const ManagementPlaceholderScreen: React.FC<ManagementPlaceholderScreenProps> = ({
  title,
  message,
}) => {
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>
            {title}
          </Text>
          <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            {message}
          </Text>
        </Surface>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
});
