import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { lightTheme } from '../theme/theme';
import '../i18n/i18n'; // Initialize i18n
import { RootNavigator } from '../navigation/RootNavigator';

/**
 * Root provider component wrapping all app providers
 * - SafeAreaProvider for safe area insets
 * - PaperProvider for Material Design 3 theming
 * - NavigationContainer for navigation
 */
export const AppProviders: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={lightTheme}>
        <NavigationContainer>
          {children || <RootNavigator />}
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
};
