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

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLocale,
    fallbackLng: 'fi',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
