/**
 * Announcement feature constants
 * Centralized configuration for announcements validation and UI constraints
 */

// Form field validation limits
export const ANNOUNCEMENT_CONSTANTS = {
  // Title validation
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 100,

  // Content validation
  MIN_CONTENT_LENGTH: 10,
  MAX_CONTENT_LENGTH: 1000,

  // Pagination
  DEFAULT_PAGE_LIMIT: 10,

  // Attachment constraints (replicated from announcementAttachments.types.ts)
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10 MB in bytes
  MAX_ATTACHMENTS_PER_ANNOUNCEMENT: 5,
} as const;

// Export individual constants for convenience
export const {
  MIN_TITLE_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  DEFAULT_PAGE_LIMIT,
  MAX_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS_PER_ANNOUNCEMENT,
} = ANNOUNCEMENT_CONSTANTS;
