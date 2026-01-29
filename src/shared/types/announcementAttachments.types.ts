/**
 * Type definitions for announcement attachment handling.
 * Covers attachment uploads, file operations, and metadata.
 */

/**
 * Represents file metadata for uploading an announcement attachment.
 * Contains original file information needed for upload processing.
 * 
 * @interface AttachmentFile
 */
export interface AttachmentFile {
  /** Original filename with extension */
  fileName: string;
  /** File size in bytes */
  size: number;
  /** MIME type (e.g., 'image/jpeg', 'application/pdf') */
  mimeType: string;
  /** Base64 encoded file content for upload */
  base64: string;
}

/**
 * Response from uploading an announcement attachment.
 * Returned by Cloud Function after successful file upload to Storage.
 * 
 * @interface UploadAttachmentResponse
 */
export interface UploadAttachmentResponse {
  /** Unique attachment ID (used when creating announcement) */
  attachmentId: string;
  /** Download URL for the uploaded file */
  downloadUrl: string;
  /** Storage path where file is located */
  storagePath: string;
  /** Timestamp when upload was completed */
  uploadedAt: string;
}

/**
 * Parameters for the uploadAnnouncementAttachment Cloud Function.
 * Represents a single file to be uploaded to Storage.
 * 
 * @interface UploadAttachmentParams
 */
export interface UploadAttachmentParams {
  /** Original filename */
  fileName: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Base64 encoded file content */
  base64: string;
}

/**
 * Parameters for the updateAnnouncementWithAttachments Cloud Function.
 * Used to update announcement with new or modified attachments.
 * 
 * @interface UpdateAnnouncementAttachmentsParams
 */
export interface UpdateAnnouncementAttachmentsParams {
  /** Announcement ID to update */
  announcementId: string;
  /** Array of attachment IDs to attach */
  attachmentIds: string[];
  /** Array of attachment IDs to remove */
  removeAttachmentIds?: string[];
}

/**
 * Allowed MIME types for announcement attachments.
 * Currently supports images (JPEG, PNG, HEIC, HEIF) and PDFs.
 * HEIC/HEIF are Apple image formats used on iOS devices.
 */
export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const;

/**
 * Maximum file size for attachments (10 MB).
 */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Maximum number of attachments per announcement.
 */
export const MAX_ATTACHMENTS_PER_ANNOUNCEMENT = 10;

/**
 * Storage path prefix for announcement attachments.
 * Full path format: announcements/{housingCompanyId}/{announcementId}/{attachmentId}
 */
export const ANNOUNCEMENT_ATTACHMENTS_PATH = 'announcements';
