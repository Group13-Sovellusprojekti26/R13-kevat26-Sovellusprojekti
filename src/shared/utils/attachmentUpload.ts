import { Alert } from 'react-native';
import { haptic } from './haptics';

interface AttachmentUploadParams {
  attachments: Array<{
    fileName: string;
    mimeType: string;
    size: number;
    base64: string;
  }>;
  uploadFn: (attachments: any[]) => Promise<string[]>;
  t: (key: string) => string;
}

interface AttachmentUploadResult {
  success: boolean;
  attachmentIds?: string[];
  error?: string;
}

/**
 * Handles attachment upload with error handling and user feedback.
 * Centralizes attachment upload logic used in Create and Edit screens.
 * Shows error alerts if upload fails.
 * 
 * @async
 * @param {AttachmentUploadParams} params - Upload parameters
 * @returns {Promise<AttachmentUploadResult>} Upload result with IDs or error
 * 
 * @example
 * const result = await handleAttachmentUpload({
 *   attachments: userAttachments,
 *   uploadFn: uploadAttachments,
 *   t: t,
 * });
 * 
 * if (result.success) {
 *   await createAnnouncement({ ...data, attachmentIds: result.attachmentIds });
 * }
 */
export const handleAttachmentUpload = async ({
  attachments,
  uploadFn,
  t,
}: AttachmentUploadParams): Promise<AttachmentUploadResult> => {
  try {
    // No attachments to upload
    if (attachments.length === 0) {
      return { success: true, attachmentIds: [] };
    }

    haptic.medium();
    const attachmentIds = await uploadFn(attachments);
    return { success: true, attachmentIds };
  } catch (uploadError) {
    console.error('Attachment upload error:', uploadError);
    haptic.error();
    Alert.alert(t('common.error'), t('announcements.attachmentUploadFailed'));
    return { success: false, error: 'announcements.attachmentUploadFailed' };
  }
};
