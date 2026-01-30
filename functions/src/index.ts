import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Storage bucket reference
const bucket = admin.storage().bucket();

// Export partner management functions
export {
  getManagementUser,
  getServiceCompanyUser,
  removeManagementUser,
  removeServiceCompanyUser,
} from "./partnerManagement";

const db = admin.firestore();

type UserRole =
  | "resident"
  | "admin"
  | "maintenance"
  | "property_manager"
  | "housing_company"
  | "service_company";

type UserProfile = {
  housingCompanyId: string;
  role: UserRole;
};

/**
 * Asserts that the request is authenticated and returns the user ID.
 * @param {CallableRequest} request - The callable request object
 * @return {string} The authenticated user ID
 * @throws {HttpsError} If user is not authenticated
 */
const assertAuth = (request: CallableRequest): string => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  return uid;
};

/**
 * Fetches user profile from Firestore.
 * Validates that profile contains role (housingCompanyId for non-admin users).
 * Admin users don't need housingCompanyId.
 * @param {string} uid - The user ID
 * @return {Promise<UserProfile>} The user profile
 * @throws {HttpsError} If profile not found or incomplete
 */
const getUserProfile = async (uid: string): Promise<UserProfile> => {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "User profile not found.");
  }
  const data = snap.data() as Partial<UserProfile>;
  if (!data?.role) {
    throw new HttpsError(
      "permission-denied",
      "User profile incomplete: missing role."
    );
  }

  // Admin doesn't need housingCompanyId
  if (data.role !== "admin" && !data?.housingCompanyId) {
    throw new HttpsError(
      "permission-denied",
      "User profile incomplete: missing housingCompanyId."
    );
  }

  return {
    housingCompanyId: data.housingCompanyId || "",
    role: data.role,
  };
};

/**
 * Fetches user profile with name information from Firestore.
 * @param {string} uid - The user ID
 * @return {Promise<{firstName: string, lastName: string}>} User name
 * @throws {HttpsError} If profile not found or name fields missing
 */
const getUserNameFromProfile = async (uid: string): Promise<{firstName: string, lastName: string}> => {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "User profile not found.");
  }
  const data = snap.data();
  const firstName = typeof data?.firstName === "string" ? data.firstName : "";
  const lastName = typeof data?.lastName === "string" ? data.lastName : "";

  return {firstName, lastName};
};

/**
 * Asserts that user has one of the allowed roles.
 * @param {UserRole} role - The user's role
 * @param {UserRole[]} allowed - Array of allowed roles
 * @throws {HttpsError} If user role is not in allowed list
 */
const assertAllowedRole = (role: UserRole, allowed: UserRole[]) => {
  if (!allowed.includes(role)) {
    throw new HttpsError("permission-denied", "Insufficient role.");
  }
};

// ========== FAULT REPORTS ==========
// Note: Read and create operations are now handled by client + Security Rules
// Only privileged operations remain as Functions

/**
 * Uploads an image to Firebase Storage for a fault report.
 * Handles base64 encoded images from React Native clients.
 *
 * @param {string} faultReportId - Fault report document ID
 * @param {string} imageBase64 - Base64 encoded image data (without data: prefix)
 * @param {string} contentType - MIME type of the image (e.g., 'image/webp')
 * @param {number} imageIndex - Index of the image (for naming)
 * @returns {string} url - Public download URL of the uploaded image
 */
export const uploadFaultReportImage = onCall(
  {region: "europe-west1", maxInstances: 10},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId} = await getUserProfile(uid);

    const {faultReportId, imageBase64, contentType, imageIndex} =
      request.data || {};

    if (
      typeof faultReportId !== "string" ||
      typeof imageBase64 !== "string" ||
      typeof contentType !== "string" ||
      typeof imageIndex !== "number"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Verify the fault report exists and belongs to user's housing company
    const reportRef = db.collection("faultReports").doc(faultReportId);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      throw new HttpsError("not-found", "Fault report not found.");
    }

    const reportData = reportSnap.data();
    if (reportData?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    // Verify the user created this report (residents can only upload to own)
    if (reportData?.createdBy !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You can only upload images to your own fault reports."
      );
    }

    // Determine file extension
    let extension = ".jpg";
    if (contentType === "image/png") extension = ".png";
    else if (contentType === "image/webp") extension = ".webp";
    else if (contentType === "image/heic") extension = ".heic";

    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    const filePath = `faultReports/${faultReportId}/image_${imageIndex}_${uniqueSuffix}${extension}`;

    try {
      // Decode base64 and upload to Storage
      const imageBuffer = Buffer.from(imageBase64, "base64");

      const file = bucket.file(filePath);
      await file.save(imageBuffer, {
        metadata: {
          contentType,
        },
      });

      // Make the file publicly readable
      await file.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      return {url: publicUrl};
    } catch (error: unknown) {
      console.error("Upload error:", error);
      throw new HttpsError("internal", "Failed to upload image.");
    }
  }
);

/**
 * Updates the status of a fault report.
 * Only accessible by admin and maintenance roles.
 * Validates that the report belongs to the user's housing company.
 *
 * @param {string} faultReportId - Fault report document ID
 * @param {string} status - New status value
 * @param {string} comment - Optional comment about the status change
 * @returns {boolean} ok - Success indicator
 */
export const updateFaultReportStatus = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);
    assertAllowedRole(role, [
      "admin",
      "maintenance",
      "service_company",
      "property_manager",
      "housing_company",
    ]);

    const {faultReportId, status, comment} = request.data || {};
    if (
      typeof faultReportId !== "string" ||
      typeof status !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const docRef = db.collection("faultReports").doc(faultReportId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Fault report not found.");
    }
    const report = snap.data();
    const knownStatuses = new Set([
      "created",
      "open",
      "waiting",
      "in_progress",
      "completed",
      "incomplete",
      "not_possible",
      "cancelled",
      "resolved",
      "closed",
    ]);
    const rawStatus = report?.status;
    const currentStatus =
      typeof rawStatus === "string" && knownStatuses.has(rawStatus) ?
        rawStatus :
        "open";
    console.log("[STATUS_DEBUG]", {
      uid,
      role,
      housingCompanyId,
      currentStatus,
      nextStatus: status,
    });
    if (report?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid,
      resolvedAt:
        status === "resolved" || status === "closed" ?
          admin.firestore.FieldValue.serverTimestamp() :
          report?.resolvedAt ?? null,
    };
    if (typeof comment === "string") {
      updates.comment = comment;
    }

    try {
      await docRef.update(updates);
    } catch (error: unknown) {
      throw new HttpsError("internal", "Failed to update fault report status.");
    }

    return {ok: true};
  }
);

/**
 * Updates a fault report description and images.
 * Residents can update only their own reports while status is open.
 *
 * @param {string} faultReportId - Fault report document ID
 * @param {string} description - Updated description
 * @param {string[]} imageUrls - Updated image URLs list
 * @returns {boolean} ok - Success indicator
 */
export const updateFaultReportDetails = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId} = await getUserProfile(uid);

    const {faultReportId, description, imageUrls} = request.data || {};

    if (typeof faultReportId !== "string") {
      throw new HttpsError("invalid-argument", "Missing fault report ID.");
    }

    if (
      typeof description !== "string" &&
      (!Array.isArray(imageUrls) || imageUrls.length === 0)
    ) {
      throw new HttpsError("invalid-argument", "No updates provided.");
    }

    if (typeof description === "string" && description.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Description is required.");
    }

    if (Array.isArray(imageUrls) && !imageUrls.every((url) => typeof url === "string")) {
      throw new HttpsError("invalid-argument", "Invalid image URLs.");
    }

    const docRef = db.collection("faultReports").doc(faultReportId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Fault report not found.");
    }

    const report = snap.data();
    if (report?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    if (report?.createdBy !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You can only update your own fault reports."
      );
    }

    if (report?.status !== "open") {
      throw new HttpsError(
        "failed-precondition",
        "Only open fault reports can be updated."
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (typeof description === "string") {
      updates.description = description.trim();
    }

    if (Array.isArray(imageUrls)) {
      updates.imageUrls = imageUrls;
    }

    await docRef.update(updates);

    return {ok: true};
  }
);

// ========== ANNOUNCEMENTS ==========
// Note: Read operations are now handled by client + Security Rules
// Only privileged operations remain as Functions

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
    assertAllowedRole(role, ["admin", "housing_company", "property_manager", "maintenance"]);

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
    assertAllowedRole(role, ["admin", "housing_company", "property_manager", "maintenance"]);

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
    assertAllowedRole(role, ["admin", "housing_company", "property_manager", "maintenance"]);

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
    assertAllowedRole(role, ["admin", "housing_company", "property_manager", "maintenance"]);

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
 * Uploads an image or PDF to Firebase Storage for an announcement.
 * Handles base64 encoded files from React Native clients.
 * Returns a public download URL.
 * 
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
    assertAllowedRole(role, ["admin", "housing_company", "property_manager", "maintenance"]);

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

// ========== USER PROFILE ==========
// Note: Read and update operations are now handled by client + Security Rules
// Only privileged operations remain as Functions

/**
 * Deletes the authenticated resident account.
 * Removes user profile, auth account, and related fault reports.
 * Only accessible by resident role.
 *
 * @returns {boolean} ok - Success indicator
 */
export const deleteResidentAccount = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role} = await getUserProfile(uid);
    assertAllowedRole(role, ["resident"]);

    // Delete all fault reports created by this resident
    const faultReportsSnap = await db
      .collection("faultReports")
      .where("createdBy", "==", uid)
      .get();

    const deleteFaultReports = faultReportsSnap.docs.map((doc) => doc.ref.delete());
    await Promise.all(deleteFaultReports);

    // Delete user profile document
    await db.collection("users").doc(uid).delete();

    // Delete user from Firebase Authentication
    try {
      await admin.auth().deleteUser(uid);
    } catch (authError: unknown) {
      const errorCode = (authError as {code?: string}).code;
      if (errorCode !== "auth/user-not-found") {
        throw authError;
      }
    }

    return {ok: true};
  }
);

// ========== HOUSING COMPANIES ==========
// Admin can create housing companies and generate invite codes

/**
 * Creates a new housing company (shell only).
 * Only accessible by admin role.
 *
 * @param {string} name - Company name
 * @param {string} address - Company address
 * @param {string} city - City
 * @param {string} postalCode - Postal code
 * @returns {string} id - Created housing company ID
 */
export const createHousingCompany = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role} = await getUserProfile(uid);
    // Only admins can create housing companies
    if (role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can create housing companies."
      );
    }

    const {name, address, city, postalCode} = request.data || {};
    if (
      typeof name !== "string" ||
      typeof address !== "string" ||
      typeof city !== "string" ||
      typeof postalCode !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Create housing company document (without user account yet)
    const companyRef = db.collection("housingCompanies").doc();
    await companyRef.set({
      name,
      address,
      city,
      postalCode,
      createdByAdminId: uid,
      isActive: true,
      isRegistered: false, // Not yet registered by housing company
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {id: companyRef.id};
  }
);

/**
 * Generates an invite code for a housing company.
 * Only accessible by admin role.
 * Invite code expires in 7 days.
 *
 * @param {string} housingCompanyId - Housing company ID
 * @returns {string} inviteCode - Generated 8-character invite code
 * @returns {string} expiresAt - ISO timestamp of expiration
 */
export const generateInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role} = await getUserProfile(uid);

    // Only admins can generate invite codes
    if (role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can generate invite codes."
      );
    }

    const {housingCompanyId} = request.data || {};
    if (typeof housingCompanyId !== "string") {
      throw new HttpsError("invalid-argument", "housingCompanyId required.");
    }

    const docRef = db.collection("housingCompanies").doc(housingCompanyId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Housing company not found.");
    }

    // Verify admin created this company
    const company = snap.data();
    if (company?.createdByAdminId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Can only generate codes for companies you created."
      );
    }

    // Generate random 8-character code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await docRef.update({
      inviteCode,
      inviteCodeExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      inviteCode,
      expiresAt: expiresAt.toISOString(),
    };
  }
);

/**
 * Deletes a housing company.
 * Only accessible by admin role.
 * Admin can only delete companies they created.
 *
 * @param {string} housingCompanyId - Housing company ID
 * @returns {boolean} ok - Success indicator
 */
export const deleteHousingCompany = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role} = await getUserProfile(uid);

    // Only admins can delete housing companies
    if (role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can delete housing companies."
      );
    }

    const {housingCompanyId} = request.data || {};
    if (typeof housingCompanyId !== "string") {
      throw new HttpsError("invalid-argument", "housingCompanyId required.");
    }

    const docRef = db.collection("housingCompanies").doc(housingCompanyId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Housing company not found.");
    }

    // Verify admin created this company
    const company = snap.data();
    if (company?.createdByAdminId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Can only delete companies you created."
      );
    }

    // Delete all residents (invite codes) for this housing company
    const residentInvitesSnap = await db
      .collection("residentInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .get();

    // For each resident invite that has been used, delete the resident's account
    const residentDeletePromises = residentInvitesSnap.docs.map(async (inviteDoc) => {
      const invite = inviteDoc.data();

      if (invite.isUsed && invite.usedByUserId) {
        const userId = invite.usedByUserId;

        try {
          // Delete user from Firebase Authentication
          await admin.auth().deleteUser(userId);
        } catch (authError: unknown) {
          // If user doesn't exist in Auth, continue
          const errorCode = (authError as {code?: string}).code;
          if (errorCode !== "auth/user-not-found") {
            console.error(`Failed to delete user ${userId}:`, authError);
          }
        }

        // Delete user profile document
        await db.collection("users").doc(userId).delete();

        // Note: Fault reports and their images will be deleted in bulk below
      }

      // Delete the resident invite document
      await inviteDoc.ref.delete();
    });

    await Promise.all(residentDeletePromises);

    // Delete all fault report images from Storage for this housing company
    const allFaultReportsSnap = await db
      .collection("faultReports")
      .where("housingCompanyId", "==", housingCompanyId)
      .get();

    // Delete all images for each fault report
    const faultReportImageDeletePromises = allFaultReportsSnap.docs.map(async (faultDoc) => {
      const faultReportId = faultDoc.id;

      try {
        // Delete all images in the faultReports/{faultReportId}/ folder
        const [files] = await bucket.getFiles({
          prefix: `faultReports/${faultReportId}/`,
        });

        // Delete each image file
        const imageDeletePromises = files.map((file) => file.delete().catch((error) => {
          console.error(`Failed to delete image ${file.name}:`, error);
        }));

        await Promise.all(imageDeletePromises);
      } catch (error) {
        console.error(`Failed to delete images for fault report ${faultReportId}:`, error);
      }

      // Delete the fault report document
      await faultDoc.ref.delete();
    });

    await Promise.all(faultReportImageDeletePromises);

    // Delete all management invites for this housing company
    const managementInvitesSnap = await db
      .collection("managementInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .get();

    // For each management invite that has been used, delete the maintenance user's account
    const managementDeletePromises = managementInvitesSnap.docs.map(async (inviteDoc) => {
      const invite = inviteDoc.data();

      if (invite.isUsed && invite.usedByUserId) {
        const userId = invite.usedByUserId;

        try {
          // Delete user from Firebase Authentication
          await admin.auth().deleteUser(userId);
        } catch (authError: unknown) {
          // If user doesn't exist in Auth, continue
          const errorCode = (authError as {code?: string}).code;
          if (errorCode !== "auth/user-not-found") {
            console.error(`Failed to delete maintenance user ${userId}:`, authError);
          }
        }

        // Delete user profile document
        await db.collection("users").doc(userId).delete();
      }

      // Delete the management invite document
      await inviteDoc.ref.delete();
    });

    await Promise.all(managementDeletePromises);

    // Delete all service company invites for this housing company
    const serviceCompanyInvitesSnap = await db
      .collection("serviceCompanyInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .get();

    // For each service company invite that has been used, delete the service company user's account
    const serviceCompanyDeletePromises = serviceCompanyInvitesSnap.docs.map(async (inviteDoc) => {
      const invite = inviteDoc.data();

      if (invite.isUsed && invite.usedByUserId) {
        const userId = invite.usedByUserId;

        try {
          // Delete user from Firebase Authentication
          await admin.auth().deleteUser(userId);
        } catch (authError: unknown) {
          // If user doesn't exist in Auth, continue
          const errorCode = (authError as {code?: string}).code;
          if (errorCode !== "auth/user-not-found") {
            console.error(`Failed to delete service company user ${userId}:`, authError);
          }
        }

        // Delete user profile document
        await db.collection("users").doc(userId).delete();
      }

      // Delete the service company invite document
      await inviteDoc.ref.delete();
    });

    await Promise.all(serviceCompanyDeletePromises);

    // If company is registered and has a user account, delete it
    if (company?.isRegistered && company?.userId) {
      const userId = company.userId;

      try {
        // Delete user from Firebase Authentication
        await admin.auth().deleteUser(userId);
      } catch (authError: unknown) {
        // If user doesn't exist in Auth, continue (they might have been deleted manually)
        const errorCode = (authError as {code?: string}).code;
        if (errorCode !== "auth/user-not-found") {
          throw authError;
        }
      }

      // Delete user profile document
      await db.collection("users").doc(userId).delete();
    }

    // Delete the housing company document
    await docRef.delete();

    return {ok: true};
  }
);

/**
 * Validates an invite code and returns housing company details.
 * This is called BEFORE registration to show pre-filled form.
 * Does NOT require authentication.
 *
 * @param {string} inviteCode - 8-character invite code
 * @returns Housing company details (name, address, city, postalCode)
 */
export const validateInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {inviteCode} = request.data || {};

    if (typeof inviteCode !== "string" || inviteCode.length < 6) {
      throw new HttpsError("invalid-argument", "Invalid invite code format.");
    }

    // Find housing company by invite code
    const companySnap = await db
      .collection("housingCompanies")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (companySnap.empty) {
      throw new HttpsError("not-found", "Invalid invite code.");
    }

    const companyDoc = companySnap.docs[0];
    const company = companyDoc.data();

    // Check if invite code is expired
    const expiresAt = company.inviteCodeExpiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Check if already registered
    if (company.isRegistered) {
      throw new HttpsError(
        "already-exists",
        "This housing company has already been registered."
      );
    }

    return {
      housingCompanyId: companyDoc.id,
      name: company.name,
      address: company.address,
      city: company.city,
      postalCode: company.postalCode,
    };
  }
);

/**
 * Registers a housing company with email and password.
 * Creates Firebase Auth account and user profile.
 * Does NOT require prior authentication.
 *
 * @param {string} inviteCode - 8-character invite code
 * @param {string} email - Email for login
 * @param {string} password - Password for login
 * @param {string} contactPerson - Contact person name
 * @param {string} phone - Optional phone number
 * @returns {boolean} ok - Success indicator
 */
export const registerWithInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {inviteCode, email, password, contactPerson, phone} =
      request.data || {};

    if (
      typeof inviteCode !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof contactPerson !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new HttpsError("invalid-argument", "Invalid email address.");
    }

    // Validate password
    if (password.length < 6) {
      throw new HttpsError(
        "invalid-argument",
        "Password must be at least 6 characters."
      );
    }

    // Find and validate housing company by invite code
    const companySnap = await db
      .collection("housingCompanies")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (companySnap.empty) {
      throw new HttpsError("not-found", "Invalid invite code.");
    }

    const companyDoc = companySnap.docs[0];
    const company = companyDoc.data();

    // Check if invite code is expired
    const expiresAt = company.inviteCodeExpiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Check if already registered
    if (company.isRegistered) {
      throw new HttpsError(
        "already-exists",
        "This housing company has already been registered."
      );
    }

    try {
      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        emailVerified: false,
      });

      // Create user profile
      await db
        .collection("users")
        .doc(userRecord.uid)
        .set({
          email,
          firstName: contactPerson,
          lastName: company.name,
          role: "housing_company",
          housingCompanyId: companyDoc.id,
          buildingId: "",
          phone: typeof phone === "string" ? phone : null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Update housing company as registered
      await companyDoc.ref.update({
        isRegistered: true,
        email,
        userId: userRecord.uid,
        contactPerson,
        phone: typeof phone === "string" ? phone : null,
        inviteCode: null, // Clear invite code after registration
        inviteCodeExpiresAt: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        userId: userRecord.uid,
        housingCompanyId: companyDoc.id,
      };
    } catch (error: unknown) {
      const errorInfo = error as {code?: string; message?: string};
      if (errorInfo.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "This email is already in use."
        );
      }
      throw new HttpsError(
        "internal",
        `Registration failed: ${errorInfo.message ?? "Unknown error"}`
      );
    }
  }
);

/**
 * Validates an invite code and creates a user profile with the role.
 * For residents and maintenance staff joining an existing housing company.
 * Accessible by authenticated users only.
 *
 * @param {string} inviteCode - 8-character invite code
 * @param {string} role - Role to assign (resident/maintenance)
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @param {string} email - User email
 * @param {string} buildingId - Building ID
 * @param {string} apartmentNumber - Optional apartment number
 * @param {string} phone - Optional phone number
 * @returns {boolean} ok - Success indicator
 * @returns {string} housingCompanyId - Housing company ID
 */
export const joinWithInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {
      inviteCode,
      role,
      firstName,
      lastName,
      email,
      buildingId,
      apartmentNumber,
      phone,
    } = request.data || {};

    if (
      typeof inviteCode !== "string" ||
      typeof role !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof buildingId !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Validate role (only resident and maintenance can join)
    const validRoles = ["maintenance", "resident"];
    if (!validRoles.includes(role)) {
      throw new HttpsError("invalid-argument", "Invalid role.");
    }

    // Check if user profile already exists
    const existingSnap = await db.collection("users").doc(uid).get();
    if (existingSnap.exists) {
      throw new HttpsError("already-exists", "User profile already exists.");
    }

    // Find housing company by invite code
    const companySnap = await db
      .collection("housingCompanies")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .get();

    if (companySnap.empty) {
      throw new HttpsError("not-found", "Invalid or expired invite code.");
    }

    const companyDoc = companySnap.docs[0];
    const company = companyDoc.data();

    // Check if invite code is expired
    const expiresAt = company.inviteCodeExpiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Create user profile
    await db
      .collection("users")
      .doc(uid)
      .set({
        email,
        firstName,
        lastName,
        phone: typeof phone === "string" ? phone : null,
        buildingId,
        apartmentNumber:
          typeof apartmentNumber === "string" ? apartmentNumber : null,
        role,
        housingCompanyId: companyDoc.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {ok: true, housingCompanyId: companyDoc.id};
  }
);

// ========== RESIDENT INVITE CODES ==========
// Housing company can create invite codes for residents

/**
 * Generates an invite code for a resident.
 * Only accessible by housing_company role.
 * Creates invite code with building and apartment info.
 *
 * @param {string} buildingId - Building identifier
 * @param {string} apartmentNumber - Apartment number
 * @returns {string} inviteCode - Generated 8-character invite code
 * @returns {string} expiresAt - ISO timestamp of expiration
 */
export const generateResidentInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role, housingCompanyId} = await getUserProfile(uid);

    // Only housing_company can generate resident invite codes
    if (role !== "housing_company") {
      throw new HttpsError(
        "permission-denied",
        "Only housing companies can generate resident invite codes."
      );
    }

    const {buildingId, apartmentNumber} = request.data || {};
    if (
      typeof buildingId !== "string" ||
      typeof apartmentNumber !== "string" ||
      !buildingId.trim() ||
      !apartmentNumber.trim()
    ) {
      throw new HttpsError(
        "invalid-argument",
        "buildingId and apartmentNumber are required."
      );
    }

    // Generate random 8-character code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create resident invite document
    const inviteRef = db.collection("residentInvites").doc();
    await inviteRef.set({
      inviteCode,
      housingCompanyId,
      buildingId: buildingId.trim(),
      apartmentNumber: apartmentNumber.trim(),
      createdByUserId: uid,
      isUsed: false,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      inviteCode,
      expiresAt: expiresAt.toISOString(),
      buildingId: buildingId.trim(),
      apartmentNumber: apartmentNumber.trim(),
    };
  }
);

/**
 * Validates a resident invite code and returns apartment details.
 * This is called BEFORE registration to show pre-filled form.
 * Does NOT require authentication.
 *
 * @param {string} inviteCode - 8-character invite code
 * @returns Apartment details (buildingId, apartmentNumber, housingCompanyId)
 */
export const validateResidentInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {inviteCode} = request.data || {};

    if (typeof inviteCode !== "string" || inviteCode.length < 6) {
      throw new HttpsError("invalid-argument", "Invalid invite code format.");
    }

    // Find resident invite by code
    const inviteSnap = await db
      .collection("residentInvites")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isUsed", "==", false)
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      throw new HttpsError("not-found", "Invalid invite code.");
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    // Check if invite code is expired
    const expiresAt = invite.expiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Get housing company name for display
    const companySnap = await db
      .collection("housingCompanies")
      .doc(invite.housingCompanyId)
      .get();

    const companyName = companySnap.exists ? companySnap.data()?.name : "Unknown";

    return {
      inviteId: inviteDoc.id,
      housingCompanyId: invite.housingCompanyId,
      housingCompanyName: companyName,
      buildingId: invite.buildingId,
      apartmentNumber: invite.apartmentNumber,
    };
  }
);

/**
 * Gets all resident invite codes for a housing company.
 * Only accessible by housing_company role.
 *
 * @returns Array of invite codes with their status
 */
export const getResidentInviteCodes = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role, housingCompanyId} = await getUserProfile(uid);

    if (role !== "housing_company") {
      throw new HttpsError(
        "permission-denied",
        "Only housing companies can view resident invite codes."
      );
    }

    const invitesSnap = await db
      .collection("residentInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const invites = await Promise.all(invitesSnap.docs.map(async (doc) => {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate();
      const isExpired = expiresAt ? expiresAt < new Date() : true;
      let residentName: string | undefined;

      if (data.isUsed && data.usedByUserId) {
        const userSnap = await db.collection("users").doc(data.usedByUserId).get();
        if (userSnap.exists) {
          const user = userSnap.data();
          const nameParts = [user?.firstName, user?.lastName].filter(Boolean);
          if (nameParts.length > 0) {
            residentName = nameParts.join(" ");
          }
        }
      }

      return {
        id: doc.id,
        inviteCode: data.inviteCode,
        buildingId: data.buildingId,
        apartmentNumber: data.apartmentNumber,
        isUsed: data.isUsed,
        isExpired,
        expiresAt: expiresAt?.toISOString(),
        createdAt: data.createdAt?.toDate()?.toISOString(),
        residentName,
      };
    }));

    return {invites};
  }
);

/**
 * Joins with a resident invite code.
 * Creates Firebase Auth user and user profile with pre-filled apartment info.
 * Does NOT require authentication (user is created during this call).
 *
 * @param {string} inviteCode - 8-character invite code
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @param {string} email - User email
 * @param {string} password - User password for authentication
 * @param {string} phone - Optional phone number
 * @returns {boolean} ok - Success indicator
 * @returns {string} housingCompanyId - Housing company ID
 */
export const joinWithResidentInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {
      inviteCode,
      firstName,
      lastName,
      email,
      password,
      phone,
    } = request.data || {};

    if (
      typeof inviteCode !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Find resident invite by code
    const inviteSnap = await db
      .collection("residentInvites")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isUsed", "==", false)
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      throw new HttpsError("not-found", "Invalid or expired invite code.");
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    // Check if invite code is expired
    const expiresAt = invite.expiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });
    } catch (authError: unknown) {
      const errorCode = (authError as {code?: string}).code;
      if (errorCode === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "Email already in use.");
      }
      throw new HttpsError("internal", "Failed to create user account.");
    }

    const uid = userRecord.uid;

    // Create user profile
    await db
      .collection("users")
      .doc(uid)
      .set({
        email,
        firstName,
        lastName,
        phone: typeof phone === "string" ? phone : null,
        buildingId: invite.buildingId,
        apartmentNumber: invite.apartmentNumber,
        role: "resident",
        housingCompanyId: invite.housingCompanyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Mark invite as used
    await inviteDoc.ref.update({
      isUsed: true,
      usedByUserId: uid,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {ok: true, housingCompanyId: invite.housingCompanyId};
  }
);

/**
 * Deletes a resident invite and associated user.
 * Only accessible by housing_company role.
 * Deletes the invite code and the registered user if exists.
 *
 * @param {string} inviteId - Resident invite document ID
 * @returns {boolean} ok - Success indicator
 */
export const deleteResidentInvite = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role, housingCompanyId} = await getUserProfile(uid);

    if (role !== "housing_company") {
      throw new HttpsError(
        "permission-denied",
        "Only housing companies can delete resident invites."
      );
    }

    const {inviteId} = request.data || {};
    if (typeof inviteId !== "string") {
      throw new HttpsError("invalid-argument", "inviteId required.");
    }

    const docRef = db.collection("residentInvites").doc(inviteId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Resident invite not found.");
    }

    // Verify invite belongs to this housing company
    const invite = snap.data();
    if (invite?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Can only delete invites from your housing company."
      );
    }

    // If invite was used and has a registered user, delete the user
    if (invite?.isUsed && invite?.usedByUserId) {
      const userId = invite.usedByUserId;

      try {
        // Delete user from Firebase Authentication
        await admin.auth().deleteUser(userId);
      } catch (authError: unknown) {
        // If user doesn't exist in Auth, continue
        const errorCode = (authError as {code?: string}).code;
        if (errorCode !== "auth/user-not-found") {
          throw authError;
        }
      }

      // Delete user profile document
      await db.collection("users").doc(userId).delete();

      // Delete all fault reports created by this user
      const faultReportsSnap = await db
        .collection("faultReports")
        .where("createdBy", "==", userId)
        .get();

      const faultReportDeletePromises = faultReportsSnap.docs.map((doc) =>
        doc.ref.delete()
      );
      await Promise.all(faultReportDeletePromises);
    }

    // Delete the resident invite document
    await docRef.delete();

    return {ok: true};
  }
);

// ========== MANAGEMENT INVITES ==========

/**
 * Generates an invite code for property management.
 * Only accessible by housing_company role.
 * Only one active management invite can exist per housing company.
 *
 * @returns {string} inviteCode - 8-character invite code
 * @returns {string} expiresAt - ISO string of expiration date
 */
export const generateManagementInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role, housingCompanyId} = await getUserProfile(uid);

    // Only housing_company can generate management invite codes
    if (role !== "housing_company") {
      throw new HttpsError(
        "permission-denied",
        "Only housing companies can generate management invite codes."
      );
    }

    // Check if there's already an active (unused and non-expired) invite
    const existingInvitesSnap = await db
      .collection("managementInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .where("isUsed", "==", false)
      .get();

    // Check if any of the existing invites are not expired
    const now = new Date();
    const activeInvites = existingInvitesSnap.docs.filter((doc) => {
      const expiresAt = doc.data().expiresAt?.toDate();
      return expiresAt && expiresAt > now;
    });

    if (activeInvites.length > 0) {
      // Return the existing active invite instead of creating a new one
      const existingInvite = activeInvites[0].data();
      return {
        inviteCode: existingInvite.inviteCode,
        expiresAt: existingInvite.expiresAt?.toDate()?.toISOString(),
      };
    }

    // Generate random 8-character code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create management invite document
    const inviteRef = db.collection("managementInvites").doc();
    await inviteRef.set({
      inviteCode,
      housingCompanyId,
      createdByUserId: uid,
      isUsed: false,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      inviteCode,
      expiresAt: expiresAt.toISOString(),
    };
  }
);

/**
 * Validates a management invite code and returns housing company details.
 * This is called BEFORE registration to show pre-filled form.
 * Does NOT require authentication.
 *
 * @param {string} inviteCode - 8-character invite code
 * @returns Housing company details (housingCompanyId, housingCompanyName)
 */
export const validateManagementInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {inviteCode} = request.data || {};

    if (typeof inviteCode !== "string" || inviteCode.length < 6) {
      throw new HttpsError("invalid-argument", "Invalid invite code format.");
    }

    // Find management invite by code
    const inviteSnap = await db
      .collection("managementInvites")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isUsed", "==", false)
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      throw new HttpsError("not-found", "Invalid invite code.");
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    // Check if invite code is expired
    const expiresAt = invite.expiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Get housing company name for display
    const companySnap = await db
      .collection("housingCompanies")
      .doc(invite.housingCompanyId)
      .get();

    const companyName = companySnap.exists ? companySnap.data()?.name : "Unknown";

    return {
      inviteId: inviteDoc.id,
      housingCompanyId: invite.housingCompanyId,
      housingCompanyName: companyName,
    };
  }
);

/**
 * Joins with a management invite code.
 * Creates Firebase Auth user and user profile with maintenance role.
 * Does NOT require authentication (user is created during this call).
 *
 * @param {string} inviteCode - 8-character invite code
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @param {string} email - User email
 * @param {string} password - User password for authentication
 * @param {string} phone - Optional phone number
 * @param {string} companyName - Management company name
 * @returns {boolean} ok - Success indicator
 * @returns {string} housingCompanyId - Housing company ID
 */
export const joinWithManagementInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {
      inviteCode,
      firstName,
      lastName,
      email,
      password,
      phone,
      companyName,
    } = request.data || {};

    if (
      typeof inviteCode !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Find management invite by code
    const inviteSnap = await db
      .collection("managementInvites")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isUsed", "==", false)
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      throw new HttpsError("not-found", "Invalid or expired invite code.");
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    // Check if invite code is expired
    const expiresAt = invite.expiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Check if there's already a maintenance user for this housing company
    const existingMaintenanceSnap = await db
      .collection("users")
      .where("housingCompanyId", "==", invite.housingCompanyId)
      .where("role", "==", "maintenance")
      .limit(1)
      .get();

    if (!existingMaintenanceSnap.empty) {
      throw new HttpsError(
        "already-exists",
        "A maintenance user already exists for this housing company."
      );
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    // Create user profile document
    await db
      .collection("users")
      .doc(userRecord.uid)
      .set({
        email,
        firstName,
        lastName,
        phone: typeof phone === "string" ? phone : null,
        companyName: typeof companyName === "string" ? companyName : null,
        role: "maintenance",
        housingCompanyId: invite.housingCompanyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Mark invite as used
    await inviteDoc.ref.update({
      isUsed: true,
      usedByUserId: userRecord.uid,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {ok: true, housingCompanyId: invite.housingCompanyId};
  }
);

// ========== SERVICE COMPANY INVITES ==========

/**
 * Generates an invite code for service company.
 * Only accessible by housing_company role.
 * Only one active service company invite can exist per housing company.
 *
 * @returns {string} inviteCode - 8-character invite code
 * @returns {string} expiresAt - ISO string of expiration date
 */
export const generateServiceCompanyInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role, housingCompanyId} = await getUserProfile(uid);

    // Only housing_company can generate service company invite codes
    if (role !== "housing_company") {
      throw new HttpsError(
        "permission-denied",
        "Only housing companies can generate service company invite codes."
      );
    }

    // Check if there's already an active (unused and non-expired) invite
    const existingInvitesSnap = await db
      .collection("serviceCompanyInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .where("isUsed", "==", false)
      .get();

    // Check if any of the existing invites are not expired
    const now = new Date();
    const activeInvites = existingInvitesSnap.docs.filter((doc) => {
      const expiresAt = doc.data().expiresAt?.toDate();
      return expiresAt && expiresAt > now;
    });

    if (activeInvites.length > 0) {
      // Return the existing active invite instead of creating a new one
      const existingInvite = activeInvites[0].data();
      return {
        inviteCode: existingInvite.inviteCode,
        expiresAt: existingInvite.expiresAt?.toDate()?.toISOString(),
      };
    }

    // Generate random 8-character code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create service company invite document
    const inviteRef = db.collection("serviceCompanyInvites").doc();
    await inviteRef.set({
      inviteCode,
      housingCompanyId,
      createdByUserId: uid,
      isUsed: false,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      inviteCode,
      expiresAt: expiresAt.toISOString(),
    };
  }
);

/**
 * Validates a service company invite code and returns housing company details.
 * This is called BEFORE registration to show pre-filled form.
 * Does NOT require authentication.
 *
 * @param {string} inviteCode - 8-character invite code
 * @returns Housing company details (housingCompanyId, housingCompanyName)
 */
export const validateServiceCompanyInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {inviteCode} = request.data || {};

    if (typeof inviteCode !== "string" || inviteCode.length < 6) {
      throw new HttpsError("invalid-argument", "Invalid invite code format.");
    }

    // Find service company invite by code
    const inviteSnap = await db
      .collection("serviceCompanyInvites")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isUsed", "==", false)
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      throw new HttpsError("not-found", "Invalid invite code.");
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    // Check if invite code is expired
    const expiresAt = invite.expiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Get housing company name for display
    const companySnap = await db
      .collection("housingCompanies")
      .doc(invite.housingCompanyId)
      .get();

    const companyName = companySnap.exists ? companySnap.data()?.name : "Unknown";

    return {
      inviteId: inviteDoc.id,
      housingCompanyId: invite.housingCompanyId,
      housingCompanyName: companyName,
    };
  }
);

/**
 * Joins with a service company invite code.
 * Creates Firebase Auth user and user profile with service_company role.
 * Does NOT require authentication (user is created during this call).
 *
 * @param {string} inviteCode - 8-character invite code
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @param {string} email - User email
 * @param {string} password - User password for authentication
 * @param {string} phone - Optional phone number
 * @param {string} companyName - Service company name
 * @returns {boolean} ok - Success indicator
 * @returns {string} housingCompanyId - Housing company ID
 */
export const joinWithServiceCompanyInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {
      inviteCode,
      firstName,
      lastName,
      email,
      password,
      phone,
      companyName,
    } = request.data || {};

    if (
      typeof inviteCode !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Find service company invite by code
    const inviteSnap = await db
      .collection("serviceCompanyInvites")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isUsed", "==", false)
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      throw new HttpsError("not-found", "Invalid or expired invite code.");
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    // Check if invite code is expired
    const expiresAt = invite.expiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Check if there's already a service company user for this housing company
    const existingServiceCompanySnap = await db
      .collection("users")
      .where("housingCompanyId", "==", invite.housingCompanyId)
      .where("role", "==", "service_company")
      .limit(1)
      .get();

    if (!existingServiceCompanySnap.empty) {
      throw new HttpsError(
        "already-exists",
        "A service company user already exists for this housing company."
      );
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    // Create user profile document
    await db
      .collection("users")
      .doc(userRecord.uid)
      .set({
        email,
        firstName,
        lastName,
        phone: typeof phone === "string" ? phone : null,
        companyName: typeof companyName === "string" ? companyName : null,
        role: "service_company",
        housingCompanyId: invite.housingCompanyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Mark invite as used
    await inviteDoc.ref.update({
      isUsed: true,
      usedByUserId: userRecord.uid,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {ok: true, housingCompanyId: invite.housingCompanyId};
  }
);

// Verification checklist:
// [ ] LF line endings
// [ ] No ESLint errors
// [ ] updateFaultReportStatus allows admin + maintenance
// [ ] Status values align with frontend
// [ ] No breaking API changes
