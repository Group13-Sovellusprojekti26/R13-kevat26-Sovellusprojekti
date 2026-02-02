import { formatAnnouncementDate } from './dateFormatter';
import { Announcement } from '@/data/models/Announcement';

/**
 * Formatted announcement dates object
 * All dates are pre-formatted strings ready for display
 */
export interface FormattedAnnouncementDates {
  createdAt: string;
  updatedAt: string;
  startDate: string | null;
  endDate: string;
}

/**
 * Format all announcement dates at once
 * Used by AnnouncementCard, AnnouncementDetailScreen, and other components
 * 
 * @param announcement - Announcement object with date properties
 * @param locale - Locale code ('fi' or 'en') for date formatting
 * @returns Object with all formatted dates
 * 
 * @example
 * const dates = formatAllAnnouncementDates(announcement, 'fi');
 * console.log(dates.startDate); // "1.2.2026"
 */
export const formatAllAnnouncementDates = (
  announcement: Announcement,
  locale: string
): FormattedAnnouncementDates => {
  return {
    createdAt: formatAnnouncementDate(announcement.createdAt, locale),
    updatedAt: formatAnnouncementDate(announcement.updatedAt, locale),
    startDate: announcement.startDate ? formatAnnouncementDate(announcement.startDate, locale) : null,
    endDate: formatAnnouncementDate(announcement.endDate, locale),
  };
};
