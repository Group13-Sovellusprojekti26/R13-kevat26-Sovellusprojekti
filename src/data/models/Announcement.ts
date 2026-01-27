import { AnnouncementType } from './enums';

export interface Announcement {
  id: string;
  housingCompanyId: string;
  authorId: string;
  authorName: string;
  type: AnnouncementType;
  title: string;
  content: string;
  imageUrls?: string[];
  startDate?: Date; // Optional start date of announcement
  startTime?: string; // Optional start time in HH:mm format
  endDate: Date; // End date of announcement
  endTime?: string; // Optional end time in HH:mm format
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isPinned: boolean;
}

export interface CreateAnnouncementInput {
  type: AnnouncementType;
  title: string;
  content: string;
  imageUrls?: string[];
  startDate?: Date; // Optional: start date
  startTime?: string; // Optional: start time in HH:mm format
  endDate: Date; // Required: end date
  endTime?: string; // Optional: end time in HH:mm format
  expiresAt?: Date;
  isPinned?: boolean;
}
