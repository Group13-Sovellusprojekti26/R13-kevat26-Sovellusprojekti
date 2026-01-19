import React, { useEffect, useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native'; 
import { lightTheme, darkTheme } from '../theme/theme';
import '../i18n/i18n'; // Initialize i18n
import { RootNavigator } from '../navigation/RootNavigator';


import { useAuthVM } from '../../features/auth/viewmodels/useAuthVM';
import { useSettingsVM } from '../../features/settings/viewmodels/useSettingsVM';

/**
 * Root provider component wrapping all app providers
 * - SafeAreaProvider for safe area insets
 * - PaperProvider for Material Design 3 theming
 * - NavigationContainer for navigation
 */
export const AppProviders: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  
  const { authReady, startAuthListener } = useAuthVM();
  const { theme: themeMode, isLoading: settingsLoading } = useSettingsVM();

  
  useEffect(() => {
    const unsubscribe = startAuthListener();
    return unsubscribe;
  }, [startAuthListener]);

  // Select theme based on user preference (must be before conditional return)
  const currentTheme = themeMode === 'dark' ? darkTheme : lightTheme;

  // Create navigation theme based on current theme (must be before conditional return)
  const navigationTheme = useMemo(() => ({
    ...(themeMode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(themeMode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: currentTheme.colors.primary,
      background: currentTheme.colors.background,
      card: currentTheme.colors.surface,
      text: currentTheme.colors.onSurface,
      border: currentTheme.colors.outline,
      notification: currentTheme.colors.error,
    },
  }), [themeMode, currentTheme]);

  
  if (!authReady || settingsLoading) {
    return <View style={{ flex: 1 }} />;
    
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={currentTheme}>
        <NavigationContainer theme={navigationTheme}>
          {children || <RootNavigator />}
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
};
