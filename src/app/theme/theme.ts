import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Material Design 3 custom theme for TaloFix
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976D2',
    primaryContainer: '#BBDEFB',
    secondary: '#FF6F00',
    secondaryContainer: '#FFE0B2',
    error: '#D32F2F',
    errorContainer: '#FFCDD2',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#64B5F6',
    primaryContainer: '#1565C0',
    secondary: '#FFB74D',
    secondaryContainer: '#E65100',
    error: '#EF5350',
    errorContainer: '#C62828',
  },
};

export type AppTheme = typeof lightTheme;
