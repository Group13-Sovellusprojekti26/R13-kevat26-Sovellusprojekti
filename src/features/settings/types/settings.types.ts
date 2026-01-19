export type ThemeMode = 'light' | 'dark';
export type LanguageCode = 'fi' | 'en';

export interface SettingsState {
  theme: ThemeMode;
  language: LanguageCode;
  isLoading: boolean;
}
