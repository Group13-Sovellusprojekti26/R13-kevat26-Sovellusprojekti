import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Design tokens - shared across all features
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

// Material Design 3 custom theme for TaloFix
// Fresh, modern, and professional color palette
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Primary: Fresh blue-green (trust & growth)
    primary: '#0D9488', // Teal-600
    onPrimary: '#FFFFFF',
    primaryContainer: '#CCFBF1', // Teal-100
    onPrimaryContainer: '#134E4A', // Teal-900
    
    // Secondary: Warm accent for CTAs
    secondary: '#F59E0B', // Amber-500
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FEF3C7', // Amber-100
    onSecondaryContainer: '#78350F', // Amber-900
    
    // Tertiary: Cool blue for info
    tertiary: '#3B82F6', // Blue-500
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#DBEAFE', // Blue-100
    onTertiaryContainer: '#1E3A8A', // Blue-900
    
    // Error states
    error: '#EF4444', // Red-500
    onError: '#FFFFFF',
    errorContainer: '#FEE2E2', // Red-100
    onErrorContainer: '#991B1B', // Red-800
    
    // Background & Surface
    background: '#F9FAFB', // Gray-50
    onBackground: '#111827', // Gray-900
    surface: '#FFFFFF',
    onSurface: '#111827',
    surfaceVariant: '#F3F4F6', // Gray-100
    onSurfaceVariant: '#6B7280', // Gray-500
    
    // Outline & other
    outline: '#D1D5DB', // Gray-300
    outlineVariant: '#E5E7EB', // Gray-200
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F9FAFB',
      level3: '#F3F4F6',
      level4: '#E5E7EB',
      level5: '#D1D5DB',
    },
  },
  roundness: 12, // Modern rounded corners
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#14B8A6', // Teal-400
    onPrimary: '#042F2E',
    primaryContainer: '#134E4A',
    onPrimaryContainer: '#CCFBF1',
    
    secondary: '#FBBF24', // Amber-400
    onSecondary: '#451A03',
    secondaryContainer: '#78350F',
    onSecondaryContainer: '#FEF3C7',
    
    tertiary: '#60A5FA', // Blue-400
    onTertiary: '#1E3A8A',
    tertiaryContainer: '#1E40AF',
    onTertiaryContainer: '#DBEAFE',
    
    error: '#F87171',
    onError: '#7F1D1D',
    errorContainer: '#991B1B',
    onErrorContainer: '#FEE2E2',
    
    background: '#111827',
    onBackground: '#F9FAFB',
    surface: '#1F2937',
    onSurface: '#F9FAFB',
    surfaceVariant: '#374151',
    onSurfaceVariant: '#9CA3AF',
    
    outline: '#4B5563',
    outlineVariant: '#374151',
  },
  roundness: 12,
};

export type AppTheme = typeof lightTheme;
