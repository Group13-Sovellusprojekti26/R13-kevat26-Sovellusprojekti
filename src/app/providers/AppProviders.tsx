import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native'; 
import { lightTheme } from '../theme/theme';
import '../i18n/i18n'; // Initialize i18n
import { RootNavigator } from '../navigation/RootNavigator';


import { useAuthVM } from '../../features/auth/viewmodels/useAuthVM';

/**
 * Root provider component wrapping all app providers
 * - SafeAreaProvider for safe area insets
 * - PaperProvider for Material Design 3 theming
 * - NavigationContainer for navigation
 */
export const AppProviders: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  
  const { authReady, startAuthListener } = useAuthVM();

  
  useEffect(() => {
    const unsubscribe = startAuthListener();
    return unsubscribe;
  }, [startAuthListener]);

  
  if (!authReady) {
    return <View style={{ flex: 1 }} />;
    
  }

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
