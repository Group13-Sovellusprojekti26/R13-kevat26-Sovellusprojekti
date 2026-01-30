/**
 * Formats a date (Date object or string) to locale-specific date representation.
 * Used for announcements and other date displays.
 */
export const formatAnnouncementDate = (date: Date | string, locale: string): string => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Formats a date to locale-specific date representation.
 */
export const formatDate = (date: Date | string, locale: string): string => {
  return new Date(date).toLocaleDateString(locale);
};
