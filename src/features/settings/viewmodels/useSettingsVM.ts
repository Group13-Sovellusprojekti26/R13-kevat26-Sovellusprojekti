import { create } from 'zustand';
import { useEffect } from 'react';
import i18n from '../../../app/i18n/i18n';
import {
  loadTheme,
  saveTheme,
  loadLanguage,
  saveLanguage,
  type ThemeMode,
  type LanguageCode,
} from '../../../data/repositories/settings.repo';
import type { SettingsState } from '../types/settings.types';

interface SettingsActions {
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (language: LanguageCode) => Promise<void>;
  loadSettings: () => Promise<void>;
}

/**
 * Settings ViewModel
 * Manages app-wide settings: theme and language
 * Persists settings to AsyncStorage
 */
const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  // Initial state
  theme: 'light',
  language: 'fi',
  isLoading: true,

  // Load settings from storage
  loadSettings: async () => {
    try {
      const [savedTheme, savedLanguage] = await Promise.all([
        loadTheme(),
        loadLanguage(),
      ]);

      // Apply saved theme or default to light
      const theme = savedTheme || 'light';
      
      // Apply saved language or keep current i18n language
      const language = (savedLanguage || i18n.language) as LanguageCode;
      
      // Change i18n language if different
      if (language !== i18n.language) {
        await i18n.changeLanguage(language);
      }

      set({ theme, language, isLoading: false });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  // Change theme and save to storage
  setTheme: async (theme: ThemeMode) => {
    try {
      await saveTheme(theme);
      set({ theme });
    } catch (error) {
      console.error('Failed to save theme:', error);
      throw error;
    }
  },

  // Change language and save to storage
  setLanguage: async (language: LanguageCode) => {
    try {
      await Promise.all([
        saveLanguage(language),
        i18n.changeLanguage(language),
      ]);
      set({ language });
    } catch (error) {
      console.error('Failed to save language:', error);
      throw error;
    }
  },
}));

/**
 * Hook for accessing settings state and actions
 */
export const useSettingsVM = () => {
  const store = useSettingsStore();

  // Load settings on mount
  useEffect(() => {
    store.loadSettings();
  }, []);

  return store;
};
