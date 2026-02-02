import { z } from 'zod';
import { AnnouncementType } from '@/data/models/enums';
import {
  MIN_TITLE_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
} from '../constants/announcements.constants';

/**
 * Zod schema for announcement form data validation.
 * Used by both CreateAnnouncementScreen and EditAnnouncementScreen.
 * Validates:
 * - Title: 3-100 characters
 * - Content: 10-1000 characters
 * - Type: One of AnnouncementType enum values
 * - Dates/Times: ISO dates and time strings
 * - isPinned: Boolean flag
 */
export const announcementFormSchema = z.object({
  title: z
    .string()
    .min(1, 'announcements.titleRequired')
    .min(MIN_TITLE_LENGTH, 'announcements.titleMinLength')
    .max(MAX_TITLE_LENGTH, 'announcements.titleMaxLength'),
  content: z
    .string()
    .min(1, 'announcements.contentRequired')
    .min(MIN_CONTENT_LENGTH, 'announcements.contentMinLength')
    .max(MAX_CONTENT_LENGTH, 'announcements.contentMaxLength'),
  type: z.nativeEnum(AnnouncementType),
  isPinned: z.boolean(),
  startDate: z.instanceof(Date).optional(),
  startTime: z.string().optional(),
  endDate: z.instanceof(Date, { message: 'announcements.endDateRequired' }),
  endTime: z.string().optional(),
});

export type AnnouncementFormSchema = z.infer<typeof announcementFormSchema>;
