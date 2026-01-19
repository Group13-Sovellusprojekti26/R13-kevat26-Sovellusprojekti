import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@talofix_theme';
const LANGUAGE_KEY = '@talofix_language';

export type ThemeMode = 'light' | 'dark';
export type LanguageCode = 'fi' | 'en';

/**
 * Settings Repository
 * Handles persistent storage of app settings using AsyncStorage
 * - Theme mode (light/dark)
 * - Language (fi/en)
 */

// Theme
export async function saveTheme(theme: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.error('Failed to save theme:', error);
    throw error;
  }
}

export async function loadTheme(): Promise<ThemeMode | null> {
  try {
    const theme = await AsyncStorage.getItem(THEME_KEY);
    return theme as ThemeMode | null;
  } catch (error) {
    console.error('Failed to load theme:', error);
    return null;
  }
}

// Language
export async function saveLanguage(language: LanguageCode): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Failed to save language:', error);
    throw error;
  }
}

export async function loadLanguage(): Promise<LanguageCode | null> {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_KEY);
    return language as LanguageCode | null;
  } catch (error) {
    console.error('Failed to load language:', error);
    return null;
  }
}
