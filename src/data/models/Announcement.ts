import { AnnouncementType } from './enums';

/**
 * Represents an attached file (image or PDF) in an announcement.
 * Stores metadata and download URL for the attachment.
 * 
 * @interface AnnouncementAttachment
 */
export interface AnnouncementAttachment {
  /** Unique identifier for the attachment */
  id: string;
  /** Original filename */
  fileName: string;
  /** MIME type (image/jpeg, image/png, application/pdf) */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Download URL for the file */
  downloadUrl: string;
  /** Timestamp when file was uploaded */
  uploadedAt: Date;
}

/**
 * Represents a published announcement in the housing company system.
 * Used for communicating important information to residents and staff.
 * 
 * @interface Announcement
 * @example
 * const announcement: Announcement = {
 *   id: "ann_123",
 *   housingCompanyId: "hc_456",
 *   authorId: "user_789",
 *   authorName: "John Doe",
 *   type: AnnouncementType.MAINTENANCE,
 *   title: "Building Maintenance",
 *   content: "Building maintenance will occur on Friday",
 *   endDate: new Date("2026-02-15"),
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   isPinned: false,
 *   attachments: []
 * };
 */
export interface Announcement {
  /** Unique identifier for the announcement */
  id: string;
  /** Housing company ID this announcement belongs to */
  housingCompanyId: string;
  /** User ID of the author who created the announcement */
  authorId: string;
  /** Display name of the author */
  authorName: string;
  /** Type of announcement (general, maintenance, emergency, event) */
  type: AnnouncementType;
  /** Announcement title/heading */
  title: string;
  /** Main content/body of the announcement */
  content: string;
  /** Optional start date when announcement becomes visible */
  startDate?: Date;
  /** Optional start time in HH:mm format */
  startTime?: string;
  /** End date when announcement expires and becomes inactive */
  endDate: Date;
  /** Optional end time in HH:mm format */
  endTime?: string;
  /** Timestamp when announcement was created */
  createdAt: Date;
  /** User ID who created the announcement */
  createdBy?: string;
  /** Timestamp of last modification */
  updatedAt: Date;
  /** User ID who last updated the announcement */
  updatedBy?: string;
  /** Display name of user who last updated */
  updatedByName?: string;
  /** Optional expiration timestamp */
  expiresAt?: Date;
  /** Whether announcement is pinned to top of list */
  isPinned: boolean;
  /** Array of attached files (images and PDFs) */
  attachments: AnnouncementAttachment[];
}

/**
 * Input data structure for creating a new announcement.
 * Excludes auto-generated fields like id, timestamps, and author info.
 * 
 * @interface CreateAnnouncementInput
 * @example
 * const input: CreateAnnouncementInput = {
 *   type: AnnouncementType.MAINTENANCE,
 *   title: "Maintenance Notice",
 *   content: "Water will be shut off on Friday",
 *   endDate: new Date("2026-02-15"),
 *   isPinned: false,
 *   attachmentIds: []
 * };
 */
export interface CreateAnnouncementInput {
  /** Type of announcement */
  type: AnnouncementType;
  /** Announcement title */
  title: string;
  /** Announcement content */
  content: string;
  /** Optional start date (when announcement becomes visible) */
  startDate?: Date;
  /** Optional start time in HH:mm format */
  startTime?: string;
  /** Required end date (when announcement expires) */
  endDate: Date;
  /** Optional end time in HH:mm format */
  endTime?: string;
  /** Optional expiration timestamp */
  expiresAt?: Date;
  /** Whether announcement should be pinned to top */
  isPinned?: boolean;
  /** Array of attachment file IDs (uploaded via uploadAnnouncementAttachment) */
  attachmentIds?: string[];
}
