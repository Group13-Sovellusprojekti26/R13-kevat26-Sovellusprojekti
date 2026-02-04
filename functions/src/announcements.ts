import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  db,
  bucket,
  assertAuth,
  getUserProfile,
  getUserNameFromProfile,
  assertAllowedRole,
  UserRole,
  FULL_ACCESS_ANNOUNCEMENT_ROLES,
} from "./utils";

// ========== ANNOUNCEMENTS ==========
// Note: Read operations are now handled by client + Security Rules
// Only privileged operations remain as Functions

/**
 * Deletes all attachments associated with an announcement from Storage.
 * Internal helper function called when deleting announcements.
 * Safely handles missing files without throwing errors.
 * 
 * @param {string} announcementId - The announcement ID
 * @param {string} housingCompanyId - The housing company ID
 * @param {any[]} attachments - Array of attachment objects with ids
 * @return {Promise<void>}
 */
async function deleteAnnouncementAttachments(
  announcementId: string,
  housingCompanyId: string,
  attachments: any[]
): Promise<void> {
  for (const attachment of attachments || []) {
    try {
      // Files are stored in folders with their extensions
      // Find and delete the file in the attachment folder
      const [files] = await bucket.getFiles({prefix: `announcements/${housingCompanyId}/${attachment.id}/`});
      for (const file of files) {
        await file.delete();
      }
    } catch (error: any) {
      console.warn(
        `Failed to delete attachment files for announcement ${announcementId}:`,
        error
      );
      // Continue even if deletion fails to ensure announcement is deleted
    }
  }
}

/**
 * Publishes a new announcement.
 * Only accessible by admin role.
 * Automatically assigns to user's housing company.
 *
 * @param {string} title - Announcement title
/**
 * Creates and publishes a new announcement.
 * Role-based authorization: admin, housing_company, property_manager, and maintenance roles only.
 * Automatically captures user name as author and housing company ID for data scoping.
 * Validates required fields (title, content, endDate) before creation.
 * Stores announcement with creation/update timestamps and metadata.
 *
 * @callable publishAnnouncement
 * @async
 * @param {Object} request - Firebase callable request
 * @param {Object} request.data - Request payload
 * @param {string} request.data.title - Announcement title (required)
 * @param {string} request.data.content - Announcement body content (required)
 * @param {string} [request.data.type] - Announcement type/category (default: 'general')
 * @param {string} [request.data.startDate] - ISO date string for display start (optional)
 * @param {string} [request.data.startTime] - Time announcement displays (HH:mm format, optional)
 * @param {string} request.data.endDate - ISO date string for display end (required)
 * @param {string} [request.data.endTime] - Time announcement stops displaying (HH:mm format, optional)
 * @param {string} [request.data.audienceBuildingId] - Building-specific targeting (optional)
 * @param {boolean} [request.data.isPinned] - Whether to pin announcement (default: false)
 * @param {string[]} [request.data.imageUrls] - Attached image URLs (default: [])
 * @return {Promise<{id: string}>} Created announcement document ID
 * @throws {HttpsError} 'unauthenticated' - User not authenticated
 * @throws {HttpsError} 'permission-denied' - User lacks required role or profile incomplete
 * @throws {HttpsError} 'invalid-argument' - Missing required fields
 *
 * @example
 * const result = await publishAnnouncement({
 *   title: "Elevator Maintenance",
 *   content: "Scheduled maintenance on Friday 9-17",
 *   type: "MAINTENANCE",
 *   endDate: "2024-12-31T23:59:59Z",
 *   isPinned: true
 * });
 * console.log("Created:", result.id);
 */
export const publishAnnouncement = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);
    assertAllowedRole(role, FULL_ACCESS_ANNOUNCEMENT_ROLES as UserRole[]);

    // Get user's first and last name
    const {firstName, lastName} = await getUserNameFromProfile(uid);
    const authorName = `${firstName} ${lastName}`.trim();

    const {title, content, type, startDate, startTime, endDate, endTime, audienceBuildingId, isPinned, attachmentIds} = request.data || {};
    
    if (typeof title !== "string" || typeof content !== "string") {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (!endDate) {
      throw new HttpsError("invalid-argument", "endDate is required.");
    }

    // Build attachments array from attachment IDs
    const attachments: any[] = [];
    if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
      for (const attachmentId of attachmentIds) {
        // Get file metadata from Storage
        // Note: files are stored with extensions (.jpg, .png, .pdf) added by uploadAnnouncementAttachment
        // We need to find the actual file since we don't know the extension here
        const fileRef = bucket.file(`announcements/${housingCompanyId}/${attachmentId}/`);
        const [files] = await bucket.getFiles({prefix: `announcements/${housingCompanyId}/${attachmentId}/`});
        
        if (files.length === 0) {
          console.warn(`Attachment file not found for ID: ${attachmentId}`);
          continue;
        }

        // Get the first file in the attachment folder (should be the only one)
        const file = files[0];
        const filePath = file.name;
        const [metadata] = await file.getMetadata();
        const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        
        // Extract filename from full path
        const fileNameFromPath = filePath.split('/').pop() || 'file';

        attachments.push({
          id: attachmentId,
          fileName: metadata.metadata?.originalName || fileNameFromPath,
          mimeType: metadata.contentType || "application/octet-stream",
          size: typeof metadata.size === 'string' ? parseInt(metadata.size, 10) : (metadata.size || 0),
          downloadUrl,
          uploadedAt: admin.firestore.Timestamp.now(),
        });
      }
    }

    const docRef = db.collection("announcements").doc();
    await docRef.set({
      housingCompanyId,
      title,
      content,
      type: typeof type === "string" ? type : "general",
      startDate: startDate ? new Date(startDate) : null,
      startTime: typeof startTime === "string" ? startTime : null,
      endDate: new Date(endDate),
      endTime: typeof endTime === "string" ? endTime : null,
      audienceBuildingId:
        typeof audienceBuildingId === "string" ? audienceBuildingId : null,
      isPinned: typeof isPinned === "boolean" ? isPinned : false,
      attachments,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
      authorId: uid,
      authorName: authorName,
    });

    return {id: docRef.id};
  }
);

/**
 * Updates an existing announcement's content and metadata.
 * Role-based authorization: admin, housing_company, property_manager, and maintenance roles only.
 * Validates that announcement belongs to user's housing company to prevent cross-company access.
 * Updates only provided fields; omitted fields remain unchanged.
 * Automatically updates the updatedAt timestamp and tracks who made the change.
 *
 * @callable updateAnnouncement
 * @async
 * @param {Object} request - Firebase callable request
 * @param {Object} request.data - Request payload
 * @param {string} request.data.announcementId - Announcement document ID to update (required)
 * @param {Object} request.data.updates - Fields to update (all optional)
 * @param {string} [request.data.updates.title] - New announcement title
 * @param {string} [request.data.updates.content] - New announcement content
 * @param {string} [request.data.updates.type] - New announcement type (GENERAL, MAINTENANCE, etc.)
 * @param {boolean} [request.data.updates.isPinned] - Whether to pin announcement
 * @param {string} [request.data.updates.startDate] - ISO date string for display start
 * @param {string} [request.data.updates.startTime] - Time announcement displays (HH:mm format)
 * @param {string} [request.data.updates.endDate] - ISO date string for display end
 * @param {string} [request.data.updates.endTime] - Time announcement stops displaying (HH:mm format)
 * @return {Promise<{ok: boolean}>} Success indicator
 * @throws {HttpsError} 'unauthenticated' - User not authenticated
 * @throws {HttpsError} 'permission-denied' - User lacks required role or cross-company access attempt
 * @throws {HttpsError} 'not-found' - Announcement not found
 * @throws {HttpsError} 'invalid-argument' - announcementId not provided or invalid updates
 *
 * @example
 * await updateAnnouncement({
 *   announcementId: 'ann_123',
 *   updates: {
 *     title: 'Updated Title',
 *     isPinned: true,
 *     endDate: '2024-12-31T23:59:59Z'
 *   }
 * });
 */
export const updateAnnouncement = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);
    assertAllowedRole(role, FULL_ACCESS_ANNOUNCEMENT_ROLES as UserRole[]);

    const {announcementId, updates} = request.data || {};
    if (typeof announcementId !== "string") {
      throw new HttpsError("invalid-argument", "announcementId required.");
    }
    if (!updates || typeof updates !== "object") {
      throw new HttpsError("invalid-argument", "updates object required.");
    }

    // Check announcement exists and belongs to housing company
    const docRef = db.collection("announcements").doc(announcementId);
    const snap = await docRef.get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "Announcement not found.");
    }

    const announcementData = snap.data();
    if (announcementData?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    try {
      // Get user info for updatedByName
      const {firstName, lastName} = await getUserNameFromProfile(uid);
      const updatedByName = `${firstName} ${lastName}`.trim() || "Unknown";

      // Build update object with Timestamp and user info
      const updateData: Record<string, any> = {
        updatedAt: admin.firestore.Timestamp.now(),
        updatedBy: uid,
        updatedByName,
      };

      // Add provided fields to update
      if (updates.title !== undefined && typeof updates.title === "string") {
        updateData.title = updates.title.trim();
      }
      if (updates.content !== undefined && typeof updates.content === "string") {
        updateData.content = updates.content.trim();
      }
      if (updates.type !== undefined && typeof updates.type === "string") {
        updateData.type = updates.type;
      }
      if (updates.isPinned !== undefined && typeof updates.isPinned === "boolean") {
        updateData.isPinned = updates.isPinned;
      }
      if (updates.startDate !== undefined) {
        if (typeof updates.startDate === "string") {
          updateData.startDate = admin.firestore.Timestamp.fromDate(new Date(updates.startDate));
        } else if (updates.startDate === null) {
          updateData.startDate = null;
        }
      }
      if (updates.startTime !== undefined) {
        updateData.startTime = updates.startTime === null ? null : String(updates.startTime || "");
      }
      if (updates.endDate !== undefined) {
        if (typeof updates.endDate === "string") {
          updateData.endDate = admin.firestore.Timestamp.fromDate(new Date(updates.endDate));
        }
      }
      if (updates.endTime !== undefined) {
        updateData.endTime = updates.endTime === null ? null : String(updates.endTime || "");
      }

      await docRef.update(updateData);
      return {ok: true};
    } catch (error: any) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Update announcement error:", error);
      throw new HttpsError("internal", "Failed to update announcement.");
    }
  }
);

/**
 * Deletes an announcement by ID.
 * Role-based authorization: admin, housing_company, property_manager, and maintenance roles only.
 * Validates that announcement belongs to user's housing company to prevent cross-company access.
 * Removes the entire announcement document from Firestore and all attached files from Storage.
 *
 * @callable deleteAnnouncement
 * @async
 * @param {Object} request - Firebase callable request
 * @param {Object} request.data - Request payload
 * @param {string} request.data.announcementId - Announcement document ID to delete (required)
 * @return {Promise<{ok: boolean}>} Success indicator (ok: true)
 * @throws {HttpsError} 'unauthenticated' - User not authenticated
 * @throws {HttpsError} 'permission-denied' - User lacks required role, profile incomplete, or cross-company access attempt
 * @throws {HttpsError} 'invalid-argument' - announcementId not provided or invalid type
 * @throws {HttpsError} 'not-found' - Announcement document does not exist
 *
 * @example
 * try {
 *   const result = await deleteAnnouncement({ announcementId: "ann_123" });
 *   console.log("Deleted successfully:", result.ok);
 * } catch (error) {
 *   if (error.code === 'not-found') {
 *     console.log("Announcement already deleted");
 *   } else if (error.code === 'permission-denied') {
 *     console.log("You cannot delete this announcement");
 *   }
 * }
 */
export const deleteAnnouncement = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);
    assertAllowedRole(role, FULL_ACCESS_ANNOUNCEMENT_ROLES as UserRole[]);

    const {announcementId} = request.data || {};
    if (typeof announcementId !== "string") {
      throw new HttpsError("invalid-argument", "announcementId required.");
    }

    const docRef = db.collection("announcements").doc(announcementId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Announcement not found.");
    }

    const announcementData = snap.data();
    if (announcementData?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    // Delete all attachments from Storage
    await deleteAnnouncementAttachments(
      announcementId,
      housingCompanyId,
      announcementData?.attachments || []
    );

    // Delete announcement document
    await docRef.delete();
    return {ok: true};
  }
);

/**
 * Uploads an announcement attachment (image or PDF) to Firebase Storage.
 * Files are stored in: announcements/{housingCompanyId}/{attachmentId}/file
 * Role-based authorization: admin, housing_company, property_manager, and maintenance roles only.
 * 
 * @callable uploadAnnouncementAttachment
 * @async
 * @param {Object} request - Firebase callable request
 * @param {Object} request.data - Request payload
 * @param {string} request.data.fileName - Original filename with extension (required)
 * @param {string} request.data.mimeType - MIME type (required, must be image/jpeg, image/png, or application/pdf)
 * @param {number} request.data.size - File size in bytes (required, max 10 MB)
 * @param {string} request.data.base64 - Base64 encoded file content (required)
 * @return {Promise<{attachmentId: string, downloadUrl: string, storagePath: string, uploadedAt: string}>}
 *   Object containing unique attachment ID, download URL, and storage path
 * @throws {HttpsError} 'unauthenticated' - User not authenticated
 * @throws {HttpsError} 'permission-denied' - User lacks required role or profile incomplete
 * @throws {HttpsError} 'invalid-argument' - Missing/invalid parameters or file validation failed
 * @throws {HttpsError} 'resource-exhausted' - File size exceeds 10 MB limit
 * 
 * @example
 * const response = await uploadAnnouncementAttachment({
 *   fileName: 'building-plan.pdf',
 *   mimeType: 'application/pdf',
 *   size: 2048000,
 *   base64: 'JVBERi0xLjQK...'
 * });
 * // response.attachmentId can now be used in createAnnouncement or updateAnnouncementWithAttachments
 */
export const uploadAnnouncementAttachment = onCall(
  {region: "europe-west1", maxInstances: 10},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId} = await getUserProfile(uid);

    const {fileName, mimeType, base64} = request.data || {};

    if (
      typeof fileName !== "string" ||
      typeof mimeType !== "string" ||
      typeof base64 !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Determine file extension from MIME type
    let extension = ".bin";
    if (mimeType === "image/jpeg") extension = ".jpg";
    else if (mimeType === "image/png") extension = ".png";
    else if (mimeType === "application/pdf") extension = ".pdf";

    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    const attachmentId = uniqueSuffix;
    const filePath = `announcements/${housingCompanyId}/${attachmentId}/file${extension}`;

    try {
      // Decode base64 and upload to Storage (IDENTICAL to uploadFaultReportImage)
      const buffer = Buffer.from(base64, "base64");

      const file = bucket.file(filePath);
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
        },
      });

      // Set custom metadata with original filename
      await file.setMetadata({
        metadata: {
          originalName: fileName,
        },
      });

      // Make the file publicly readable
      await file.makePublic();

      // Get the public URL
      const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      return {
        attachmentId,
        downloadUrl,
        storagePath: filePath,
        uploadedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      console.error("Announcement attachment upload error:", error);
      throw new HttpsError("internal", "Failed to upload attachment.");
    }
  }
);

/**
 * Updates an announcement with new or modified attachments.
 * Attaches previously uploaded files to announcement and removes specified attachments.
 * Role-based authorization: admin, housing_company, property_manager, and maintenance roles only.
 * Validates that announcement belongs to user's housing company.
 * 
 * @callable updateAnnouncementWithAttachments
 * @async
 * @param {Object} request - Firebase callable request
 * @param {Object} request.data - Request payload
 * @param {string} request.data.announcementId - Announcement document ID (required)
 * @param {string[]} request.data.attachmentIds - Array of attachment IDs to add/attach (required, can be empty)
 * @param {string[]} [request.data.removeAttachmentIds] - Array of attachment IDs to remove (optional)
 * @return {Promise<{ok: boolean}>} Success indicator
 * @throws {HttpsError} 'unauthenticated' - User not authenticated
 * @throws {HttpsError} 'permission-denied' - User lacks required role or cross-company access attempt
 * @throws {HttpsError} 'not-found' - Announcement not found
 * @throws {HttpsError} 'invalid-argument' - Missing/invalid parameters
 * 
 * @example
 * // Add attachments to announcement
 * await updateAnnouncementWithAttachments({
 *   announcementId: 'ann_123',
 *   attachmentIds: ['attach_1', 'attach_2']
 * });
 * 
 * // Add and remove attachments
 * await updateAnnouncementWithAttachments({
 *   announcementId: 'ann_123',
 *   attachmentIds: ['attach_3'],
 *   removeAttachmentIds: ['attach_1']
 * });
 */
export const updateAnnouncementWithAttachments = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);
    assertAllowedRole(role, FULL_ACCESS_ANNOUNCEMENT_ROLES as UserRole[]);

    const {announcementId, attachmentIds, removeAttachmentIds} = request.data || {};

    // Validate inputs
    if (typeof announcementId !== "string") {
      throw new HttpsError("invalid-argument", "announcementId required.");
    }
    if (!Array.isArray(attachmentIds)) {
      throw new HttpsError("invalid-argument", "attachmentIds must be array.");
    }

    // Check announcement exists and belongs to housing company
    const announcementRef = db.collection("announcements").doc(announcementId);
    const announcementSnap = await announcementRef.get();

    if (!announcementSnap.exists) {
      throw new HttpsError("not-found", "Announcement not found.");
    }

    const announcementData = announcementSnap.data();
    if (announcementData?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    try {
      // Get existing attachments
      const existingAttachments = announcementData?.attachments || [];

      // Build updated attachments array
      // Start with existing ones that are not being removed
      const removeIds = new Set(removeAttachmentIds || []);
      let updatedAttachments = existingAttachments.filter(
        (att: any) => !removeIds.has(att.id)
      );

      // Add new attachments from Storage
      for (const attachmentId of attachmentIds) {
        // Check if already attached
        if (updatedAttachments.some((att: any) => att.id === attachmentId)) {
          continue; // Skip duplicates
        }

        // Find the actual file in the attachment folder (it may have an extension)
        const [files] = await bucket.getFiles({prefix: `announcements/${housingCompanyId}/${attachmentId}/`});
        
        if (files.length === 0) {
          console.warn(`Attachment files not found for: announcements/${housingCompanyId}/${attachmentId}/`);
          continue; // Skip missing files
        }

        // Use the first file in the folder
        const fileRef = files[0];
        const [metadata] = await fileRef.getMetadata();
        const storagePath = fileRef.name;
        const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        updatedAttachments.push({
          id: attachmentId,
          fileName: metadata.metadata?.originalName || "file",
          mimeType: metadata.contentType || "application/octet-stream",
          size: typeof metadata.size === 'string' ? parseInt(metadata.size, 10) : (metadata.size || 0),
          downloadUrl,
          uploadedAt: admin.firestore.Timestamp.now(),
        });
      }

      // Delete files for removed attachments from Storage
      for (const attachmentId of removeAttachmentIds || []) {
        const storagePath = `announcements/${housingCompanyId}/${attachmentId}/file`;
        try {
          await bucket.file(storagePath).delete();
        } catch (error: any) {
          console.warn(`Failed to delete file: ${storagePath}`, error);
          // Continue even if deletion fails
        }
      }

      // Update announcement
      await announcementRef.update({
        attachments: updatedAttachments,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      return {ok: true};
    } catch (error: any) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Update attachments error:", error);
      throw new HttpsError("internal", "Failed to update attachments.");
    }
  }
);

/**
 * Deletes an announcement attachment file from Storage.
 * Only used when user removes attachments before creating/updating announcement.
 * Does NOT require announcement to exist - just deletes the file.
 * 
 * @callable deleteAnnouncementAttachmentFile
 * @async
 * @param {Object} request - Firebase callable request
 * @param {Object} request.data - Request payload
 * @param {string} request.data.attachmentId - Attachment ID to delete (required)
 * @return {Promise<{ok: boolean}>} Success indicator
 * @throws {HttpsError} 'unauthenticated' - User not authenticated
 * @throws {HttpsError} 'permission-denied' - User lacks required role or profile incomplete
 * @throws {HttpsError} 'invalid-argument' - Missing attachmentId
 * 
 * @example
 * await deleteAnnouncementAttachmentFile({ attachmentId: 'attach_123' });
 */
export const deleteAnnouncementAttachmentFile = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);
    assertAllowedRole(role, FULL_ACCESS_ANNOUNCEMENT_ROLES as UserRole[]);

    const {attachmentId} = request.data || {};
    if (typeof attachmentId !== "string") {
      throw new HttpsError("invalid-argument", "attachmentId required.");
    }

    try {
      const storagePath = `announcements/${housingCompanyId}/${attachmentId}/file`;
      const fileRef = bucket.file(storagePath);

      // Check if file exists before deleting
      const [exists] = await fileRef.exists();
      if (exists) {
        await fileRef.delete();
      }

      return {ok: true};
    } catch (error: any) {
      console.error("Delete attachment file error:", error);
      // Don't throw error - just log it. File cleanup is not critical.
      return {ok: true};
    }
  }
);
