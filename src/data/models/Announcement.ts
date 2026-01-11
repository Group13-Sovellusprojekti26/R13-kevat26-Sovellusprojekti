import { AnnouncementType } from './enums';

export interface Announcement {
  id: string;
  buildingId: string;
  authorId: string;
  authorName: string;
  type: AnnouncementType;
  title: string;
  content: string;
  imageUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isPinned: boolean;
}

export interface CreateAnnouncementInput {
  buildingId: string;
  type: AnnouncementType;
  title: string;
  content: string;
  imageUrls?: string[];
  expiresAt?: Date;
  isPinned?: boolean;
}
