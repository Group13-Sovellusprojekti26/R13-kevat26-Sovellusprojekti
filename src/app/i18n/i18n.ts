import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import fi from './locales/fi.json';
import en from './locales/en.json';

const resources = {
  fi: { translation: fi },
  en: { translation: en },
};

// Get device locale
const deviceLocale = getLocales()[0]?.languageCode || 'fi';
const supportedLanguage = deviceLocale === 'en' ? 'en' : 'fi';

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: supportedLanguage,
    fallbackLng: 'fi',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense to avoid SSR issues
    },
  });

export default i18n;
