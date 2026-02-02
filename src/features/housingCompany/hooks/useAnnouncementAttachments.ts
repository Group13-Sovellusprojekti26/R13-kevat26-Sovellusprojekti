import { create } from 'zustand';
import {
  uploadAnnouncementAttachment,
  deleteAnnouncementAttachmentFile,
  updateAnnouncementWithAttachments,
} from '@/data/repositories/announcements.repo';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { AppError } from '@/shared/utils/errors';
import type { UploadAttachmentParams, UploadAttachmentResponse } from '@/shared/types/announcementAttachments.types';

/**
 * State interface for announcement attachments operations using Zustand.
 * Manages attachment uploads, deletions, and tracking.
 * Separate from main announcements VM for better code organization and reusability.
 * 
 * @interface AnnouncementAttachmentsState
 * @property {Function} uploadAttachment - Upload single attachment file
 * @property {Function} uploadAttachments - Upload multiple attachments sequentially
 * @property {Function} deleteAttachment - Delete attachment from storage
 * @property {Function} updateAttachments - Update announcement with new/removed attachments
 * @property {Function} getRemoveAttachmentIds - Compare attachment lists to find removed IDs
 */
interface AnnouncementAttachmentsState {
  /**
   * Upload an attachment file for an announcement.
   * Handles file upload to Cloud Storage via Cloud Function.
   * Returns attachment ID for use in createAnnouncement or updateAttachments.
   * 
   * @async
   * @param {UploadAttachmentParams} params - File parameters (fileName, size, mimeType, base64)
   * @returns {Promise<UploadAttachmentResponse>} Upload response with attachmentId and downloadUrl
   * @throws {AppError} If upload fails due to size limit, file type, or permission errors
   */
  uploadAttachment: (params: UploadAttachmentParams) => Promise<UploadAttachmentResponse>;

  /**
   * Upload announcement attachments sequentially and collect their IDs.
   * Refreshes user token before upload to ensure auth is valid.
   * 
   * @async
   * @param {Array} attachments - Array of attachments (fileName, mimeType, size, base64)
   * @returns {Promise<string[]>} Array of uploaded attachment IDs
   */
  uploadAttachments: (attachments: Array<{
    fileName: string;
    mimeType: string;
    size: number;
    base64: string;
  }>) => Promise<string[]>;

  /**
   * Delete an attachment file from Storage.
   * Used when user removes attachments before announcement creation.
   * Non-critical errors are silently logged.
   * 
   * @async
   * @param {string} attachmentId - Attachment ID to delete
   * @returns {Promise<void>}
   */
  deleteAttachment: (attachmentId: string) => Promise<void>;

  /**
   * Update announcement with new and removed attachments.
   * Calls Cloud Function to attach files and remove old ones.
   * 
   * @async
   * @param {string} announcementId - Announcement to update
   * @param {string[]} allAttachmentIds - All attachment IDs to keep
   * @param {string[]} [removeAttachmentIds] - Attachment IDs to remove
   * @returns {Promise<void>}
   */
  updateAttachments: (
    announcementId: string,
    allAttachmentIds: string[],
    removeAttachmentIds?: string[]
  ) => Promise<void>;

  /**
   * Calculate removed attachment IDs by comparing existing and remaining attachments.
   * Used to determine which attachments to remove when updating announcement.
   * 
   * @param {Array} originalAttachments - Original list of attachments (with id property)
   * @param {Array} remainingAttachments - Remaining attachments after user modifications
   * @returns {string[]} IDs of removed attachments
   */
  getRemoveAttachmentIds: (originalAttachments: any[], remainingAttachments: any[]) => string[];
}

/**
 * Zustand store hook for managing announcement attachments.
 * Provides interface for uploading, deleting, and updating announcement attachments.
 * Separate from main announcements VM for cleaner code organization.
 * Integrates with Firebase repositories for attachment persistence.
 * 
 * @hook useAnnouncementAttachments
 * @returns {AnnouncementAttachmentsState} Store with attachment operation methods
 * 
 * @example
 * // In a React component
 * const attachments = useAnnouncementAttachments();
 * 
 * try {
 *   const uploadResponse = await attachments.uploadAttachment({
 *     fileName: 'document.pdf',
 *     size: 2048000,
 *     mimeType: 'application/pdf',
 *     base64: 'JVBERi0xLjQK...'
 *   });
 *   console.log(uploadResponse.attachmentId);
 * } catch (error) {
 *   console.log('Upload failed', error);
 * }
 */
export const useAnnouncementAttachments = create<AnnouncementAttachmentsState>(() => ({
  /**
   * Upload a single attachment file
   */
  uploadAttachment: async (params: UploadAttachmentParams) => {
    try {
      const response = await uploadAnnouncementAttachment(params);
      return response;
    } catch (err: any) {
      let errorMsg = 'announcements.attachmentUploadFailed';
      
      if (err instanceof AppError) {
        errorMsg = err.message;
      } else if (err?.code === 'functions/permission-denied') {
        errorMsg = 'announcements.permissionDenied';
      } else if (err?.code === 'functions/resource-exhausted') {
        errorMsg = 'announcements.fileTooLarge';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      throw err;
    }
  },

  /**
   * Upload multiple attachments sequentially
   */
  uploadAttachments: async (attachments: Array<{
    fileName: string;
    mimeType: string;
    size: number;
    base64: string;
  }>): Promise<string[]> => {
    const newAttachmentIds: string[] = [];

    if (attachments.length === 0) {
      return newAttachmentIds;
    }

    // Refresh token before upload
    const user = getCurrentUser();
    if (user) {
      await user.getIdToken(true);
    }

    // Upload attachments sequentially
    for (const att of attachments) {
      const uploadResult = await uploadAnnouncementAttachment({
        fileName: att.fileName,
        size: att.size,
        mimeType: att.mimeType,
        base64: att.base64,
      });
      newAttachmentIds.push(uploadResult.attachmentId);
    }

    return newAttachmentIds;
  },

  /**
   * Delete an attachment file
   */
  deleteAttachment: async (attachmentId: string) => {
    try {
      await deleteAnnouncementAttachmentFile(attachmentId);
    } catch (err: any) {
      console.error('Delete attachment error:', err);
      // Non-critical error - don't throw
    }
  },

  /**
   * Update announcement with new and removed attachments
   */
  updateAttachments: async (
    announcementId: string,
    allAttachmentIds: string[],
    removeAttachmentIds?: string[]
  ): Promise<void> => {
    if (allAttachmentIds.length === 0 && !removeAttachmentIds?.length) {
      return; // No changes needed
    }

    await updateAnnouncementWithAttachments(announcementId, allAttachmentIds, removeAttachmentIds);
  },

  /**
   * Calculate removed attachment IDs
   */
  getRemoveAttachmentIds: (originalAttachments: any[], remainingAttachments: any[]): string[] => {
    const remainingIds = new Set(remainingAttachments.map(att => att.id));
    return originalAttachments
      .map(att => att.id)
      .filter(id => !remainingIds.has(id));
  },
}));
