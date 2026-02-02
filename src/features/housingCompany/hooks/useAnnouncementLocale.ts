import { useTranslation } from 'react-i18next';

/**
 * Custom hook for getting announcement locale
 * Returns the current language code ('fi' or 'en') for date/time formatting
 * 
 * @returns {string} Locale code ('fi' or 'en')
 * 
 * @example
 * const locale = useAnnouncementLocale();
 * const date = formatAnnouncementDate(announcement.createdAt, locale);
 */
export const useAnnouncementLocale = (): string => {
  const { i18n } = useTranslation();
  return i18n.language;
};
