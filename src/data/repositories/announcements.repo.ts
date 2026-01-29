import { AppError } from '../../shared/utils/errors';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  Timestamp,
  limit,
  startAfter,
  QueryConstraint,
  DocumentSnapshot,
} from 'firebase/firestore';
import { functions, db } from '../firebase/firebase';
import { Announcement, CreateAnnouncementInput, AnnouncementAttachment } from '../models/Announcement';
import { UploadAttachmentParams, UploadAttachmentResponse, UpdateAnnouncementAttachmentsParams } from '../../shared/types/announcementAttachments.types';
import { AnnouncementType } from '../models/enums';
import { getCurrentUser } from '../../features/auth/services/auth.service';
import { getUserProfile } from './users.repo';
import { timestampToDate } from '../../shared/utils/firebase';

/**
 * Firestore data structure for announcement documents.
 * This is the raw format stored in Firestore before transformation to Announcement domain model.
 * 
 * @interface FirestoreAnnouncementData
 * @property {string} [housingCompanyId] - Housing company this announcement belongs to
 * @property {string} [buildingId] - Specific building (optional filtering)
 * @property {string} [audienceBuildingId] - Building that can view this announcement
 * @property {string} [createdBy] - User ID of announcement creator
 * @property {string} [authorId] - Alternative field for creator user ID
 * @property {string} [authorName] - Display name of announcement creator
 * @property {AnnouncementType | string} type - Announcement type/category
 * @property {string} title - Announcement title/headline
 * @property {string} content - Announcement body content
 * @property {Timestamp} [startDate] - When announcement becomes visible
 * @property {string} [startTime] - Time announcement becomes visible (HH:mm format)
 * @property {Timestamp} [endDate] - When announcement stops being visible
 * @property {string} [endTime] - Time announcement stops being visible (HH:mm format)
 * @property {Timestamp} createdAt - Timestamp when announcement was created
 * @property {string} [updatedBy] - User ID of last editor
 * @property {string} [updatedByName] - Display name of last editor
 * @property {Timestamp} [updatedAt] - Timestamp of last update
 * @property {Timestamp} [expiresAt] - Alternative field for expiration date
 * @property {boolean} [isPinned] - Whether announcement is pinned to top
 */
interface FirestoreAnnouncementData {
  housingCompanyId?: string;
  buildingId?: string;
  audienceBuildingId?: string;
  createdBy?: string;
  authorId?: string;
  authorName?: string;
  type: AnnouncementType | string;
  title: string;
  content: string;
  startDate?: Timestamp;
  startTime?: string;
  endDate?: Timestamp;
  endTime?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
  updatedByName?: string;
  expiresAt?: Timestamp;
  isPinned?: boolean;
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    downloadUrl: string;
    uploadedAt: Timestamp;
  }>;
}

/**
 * Type guard to validate if a string value is a valid AnnouncementType enum member.
 * 
 * @function isAnnouncementType
 * @param {string} value - String value to validate
 * @returns {boolean} True if value is a valid AnnouncementType, false otherwise
 * 
 * @example
 * if (isAnnouncementType("GENERAL")) {
 *   const type: AnnouncementType = "GENERAL";
 * }
 */
const isAnnouncementType = (value: string): value is AnnouncementType =>
  Object.values(AnnouncementType).includes(value as AnnouncementType);

/**
 * Transforms raw Firestore announcement document into domain model.
 * Handles type validation (defaults to GENERAL if type is invalid).
 * Converts Firestore Timestamps to JavaScript Date objects.
 * Validates presence of required fields and throws error if missing.
 * 
 * @function mapAnnouncement
 * @param {string} id - The announcement document ID
 * @param {FirestoreAnnouncementData} data - Raw data from Firestore
 * @returns {Announcement} Transformed announcement domain model
 * @throws {AppError} With code 'missing-fields' if required fields are missing
 * 
 * @example
 * const announcement = mapAnnouncement("doc_id", firestoreDocData);
 * console.log(announcement.createdAt instanceof Date); // true
 */
const mapAnnouncement = (id: string, data: FirestoreAnnouncementData): Announcement => {
  if (!data.createdAt || !data.title || !data.content || !data.type) {
    throw new AppError('announcements.missingRequiredFields', 'missing-fields');
  }

  const type = isAnnouncementType(data.type as string)
    ? (data.type as AnnouncementType)
    : AnnouncementType.GENERAL;

  // Map attachments from Firestore format to domain model
  const attachments: AnnouncementAttachment[] = (data.attachments || []).map(att => ({
    id: att.id,
    fileName: att.fileName,
    mimeType: att.mimeType,
    size: att.size,
    downloadUrl: att.downloadUrl,
    uploadedAt: timestampToDate(att.uploadedAt) as Date,
  }));

  return {
    id,
    housingCompanyId: data.housingCompanyId || '',
    authorId: data.createdBy || data.authorId || '',
    authorName: data.authorName || '',
    type,
    title: data.title,
    content: data.content,
    startDate: data.startDate ? timestampToDate(data.startDate) as Date : undefined,
    startTime: data.startTime || undefined,
    endDate: data.endDate ? timestampToDate(data.endDate) as Date : new Date(),
    endTime: data.endTime || undefined,
    createdAt: timestampToDate(data.createdAt) as Date,
    createdBy: data.createdBy,
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) as Date : timestampToDate(data.createdAt) as Date,
    updatedBy: data.updatedBy,
    updatedByName: data.updatedByName,
    expiresAt: data.expiresAt ? timestampToDate(data.expiresAt) : undefined,
    isPinned: data.isPinned || false,
    attachments,
  };
};

/**
 * Retrieves active announcements for a housing company using cursor-based pagination.
 * Active announcements are those where endDate is today or in the future.
 * Results are sorted by pinned status first, then by creation date (newest first).
 * 
 * @async
 * @function getActiveAnnouncementsByHousingCompany
 * @param {string} housingCompanyId - The housing company ID to fetch announcements for
 * @param {number} [pageLimit=10] - Maximum number of announcements to return per page
 * @param {DocumentSnapshot} [lastDocSnapshot] - Cursor from previous page for pagination
 * @returns {Promise<{announcements: Announcement[], lastDoc: DocumentSnapshot | null}>} 
 *   Object containing array of announcements and cursor for next page (null if no more pages)
 * @throws {AppError} If user is not authenticated
 * 
 * @example
 * const { announcements, lastDoc } = await getActiveAnnouncementsByHousingCompany("hc_123", 10);
 * if (lastDoc) {
 *   const nextPage = await getActiveAnnouncementsByHousingCompany("hc_123", 10, lastDoc);
 * }
 */
export async function getActiveAnnouncementsByHousingCompany(
  housingCompanyId: string,
  pageLimit: number = 10,
  lastDocSnapshot?: DocumentSnapshot
): Promise<{ announcements: Announcement[]; lastDoc: DocumentSnapshot | null }> {
  const user = getCurrentUser();
  if (!user) {
    throw new AppError('auth.loginRequired', 'auth/not-authenticated');
  }

  // Build query constraints
  const constraints: QueryConstraint[] = [
    where('housingCompanyId', '==', housingCompanyId),
    orderBy('createdAt', 'desc'),
    limit(pageLimit * 2), // Load 2x to account for filtering by expiry date
  ];

  // Add cursor for pagination
  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, 'announcements'), ...constraints);
  const snapshot = await getDocs(q);

  // Compare only dates (not times) - announcement is active until end of endDate day
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const announcements: Announcement[] = [];
  let lastValidDoc: DocumentSnapshot | null = null;

  for (const docSnap of snapshot.docs) {
    const announcement = mapAnnouncement(docSnap.id, docSnap.data() as FirestoreAnnouncementData);
    const announcementEndDate = new Date(announcement.endDate.getFullYear(), announcement.endDate.getMonth(), announcement.endDate.getDate());
    
    // Announcement is active if endDate is today or in the future
    if (announcementEndDate.getTime() >= today.getTime()) {
      announcements.push(announcement);
      lastValidDoc = docSnap;
      if (announcements.length >= pageLimit) {
        break;
      }
    }
  }

  // Sort by pinned status first (pinned true comes first), then by createdAt
  announcements.sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return a.isPinned ? -1 : 1;
  });

  return {
    announcements,
    lastDoc: announcements.length >= pageLimit ? lastValidDoc : null,
  };
}

/**
 * Retrieves expired announcements for a housing company using cursor-based pagination.
 * Expired announcements are those where endDate is before today (the end of day is considered).
 * Results are sorted by creation date (newest first).
 * 
 * @async
 * @function getExpiredAnnouncementsByHousingCompany
 * @param {string} housingCompanyId - The housing company ID to fetch announcements for
 * @param {number} [pageLimit=10] - Maximum number of announcements to return per page
 * @param {DocumentSnapshot} [lastDocSnapshot] - Cursor from previous page for pagination
 * @returns {Promise<{announcements: Announcement[], lastDoc: DocumentSnapshot | null}>} 
 *   Object containing array of expired announcements and cursor for next page (null if no more pages)
 * @throws {AppError} If user is not authenticated
 * 
 * @example
 * const { announcements, lastDoc } = await getExpiredAnnouncementsByHousingCompany("hc_123", 10);
 * const expiredCount = announcements.length;
 */
export async function getExpiredAnnouncementsByHousingCompany(
  housingCompanyId: string,
  pageLimit: number = 10,
  lastDocSnapshot?: DocumentSnapshot
): Promise<{ announcements: Announcement[]; lastDoc: DocumentSnapshot | null }> {
  const user = getCurrentUser();
  if (!user) {
    throw new AppError('auth.loginRequired', 'auth/not-authenticated');
  }

  // Build query constraints
  const constraints: QueryConstraint[] = [
    where('housingCompanyId', '==', housingCompanyId),
    orderBy('createdAt', 'desc'),
    limit(pageLimit * 2), // Load 2x to account for filtering by expiry date
  ];

  // Add cursor for pagination
  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, 'announcements'), ...constraints);
  const snapshot = await getDocs(q);

  // Compare only dates (not times) - announcement is expired after end of endDate day
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const announcements: Announcement[] = [];
  let lastValidDoc: DocumentSnapshot | null = null;

  for (const docSnap of snapshot.docs) {
    const announcement = mapAnnouncement(docSnap.id, docSnap.data() as FirestoreAnnouncementData);
    const announcementEndDate = new Date(announcement.endDate.getFullYear(), announcement.endDate.getMonth(), announcement.endDate.getDate());
    
    // Announcement is expired if endDate is before today
    if (announcementEndDate.getTime() < today.getTime()) {
      announcements.push(announcement);
      lastValidDoc = docSnap;
      if (announcements.length >= pageLimit) {
        break;
      }
    }
  }

  // Sort by createdAt (newest first)
  announcements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    announcements,
    lastDoc: announcements.length >= pageLimit ? lastValidDoc : null,
  };
}

/**
 * Retrieves a single announcement by its ID from Firestore.
 * This is a direct Firestore query without role-based restrictions.
 * Security is enforced at the Firestore Security Rules level.
 * 
 * @async
 * @function getAnnouncementById
 * @param {string} id - The announcement document ID
 * @returns {Promise<Announcement | null>} The announcement object if found, null otherwise
 * @throws {AppError} If user is not authenticated
 * 
 * @example
 * const announcement = await getAnnouncementById("ann_123");
 * if (announcement) {
 *   console.log(announcement.title);
 * }
 */
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const user = getCurrentUser();
  if (!user) {
    throw new AppError('auth.loginRequired', 'auth/not-authenticated');
  }

  const docRef = doc(db, 'announcements', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return mapAnnouncement(docSnap.id, docSnap.data() as FirestoreAnnouncementData);
}

/**
 * Creates a new announcement via Cloud Function.
 * Validates user authentication and calls the publishAnnouncement Cloud Function.
 * The Cloud Function handles role-based authorization (admin, housing_company, property_manager, maintenance).
 * The Cloud Function also handles uploading images to Firebase Storage.
 * 
 * @async
 * @function createAnnouncement
 * @param {CreateAnnouncementInput} input - Announcement creation data including title, content, type, dates, etc.
 * @returns {Promise<string>} The ID of the newly created announcement document
 * @throws {AppError} If user is not authenticated or lacks permission to create announcements
 * @throws {AppError} With code 'permission-denied' if user role is not authorized
 * @throws {AppError} If announcement creation fails
 * 
 * @example
 * const announcementId = await createAnnouncement({
 *   title: "Building Maintenance",
 *   content: "Scheduled elevator maintenance on Friday",
 *   type: "MAINTENANCE",
 *   endDate: new Date("2024-12-31"),
 *   isPinned: true
 * });
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<string> {
  try {
    // Verify user is authenticated
    const user = getCurrentUser();
    console.log('createAnnouncement - user auth status:', { uid: user?.uid, isAuth: !!user });
    
    if (!user) {
      throw new AppError('auth.loginRequired', 'auth/not-authenticated');
    }

    // Force token refresh before Cloud Function call
    // This ensures token is valid, especially important when called after uploadAttachment
    console.log('Refreshing ID token before publishAnnouncement...');
    await user.getIdToken(true);

    const publishAnnouncement = httpsCallable(functions, 'publishAnnouncement');
    
    const result = await publishAnnouncement({
      title: input.title,
      content: input.content,
      type: input.type || 'general',
      startDate: input.startDate ? input.startDate.toISOString() : null,
      startTime: input.startTime || null,
      endDate: input.endDate.toISOString(),
      endTime: input.endTime || null,
      isPinned: input.isPinned || false,
      attachmentIds: input.attachmentIds || [],
    }) as { data: { id: string } };

    return result.data.id;
  } catch (error: any) {
    // Map Firebase errors to AppError
    if (error instanceof AppError) {
      throw error;
    }
    if (error?.code === 'permission-denied') {
      throw new AppError('announcements.permissionDenied', 'permission-denied');
    }
    throw new AppError(
      error?.message || 'announcements.createFailed',
      error?.code || 'unknown'
    );
  }
}

/**
 * Updates fields of an existing announcement.
 * Role-based authorization enforced via Cloud Function.
 * Only users with admin, housing_company, property_manager, or maintenance roles can update.
 * Prevents cross-company access and updates only allowed fields.
 * Automatically tracks update timestamp and user who made the change.
 * 
 * @async
 * @function updateAnnouncement
 * @param {string} id - The announcement document ID to update
 * @param {Object} updates - Object containing fields to update (all optional)
 * @param {string} [updates.title] - New announcement title
 * @param {string} [updates.content] - New announcement content/body
 * @param {AnnouncementType} [updates.type] - New announcement type (GENERAL, MAINTENANCE, etc.)
 * @param {boolean} [updates.isPinned] - Whether to pin this announcement to top
 * @param {Date} [updates.startDate] - Announcement display start date
 * @param {string} [updates.startTime] - Announcement display start time (HH:mm format)
 * @param {Date} [updates.endDate] - Announcement display end date
 * @param {string} [updates.endTime] - Announcement display end time (HH:mm format)
 * @returns {Promise<void>}
 * @throws {AppError} If user is not authenticated
 * @throws {AppError} With code 'permission-denied' if user lacks update rights
 * @throws {AppError} With code 'not-found' if announcement does not exist
 * 
 * @example
 * await updateAnnouncement("ann_123", {
 *   title: "Updated Title",
 *   isPinned: false,
 *   endDate: new Date("2024-12-31")
 * });
 */
export async function updateAnnouncement(
  id: string,
  updates: {
    title?: string;
    content?: string;
    type?: AnnouncementType;
    isPinned?: boolean;
    startDate?: Date;
    startTime?: string | null;
    endDate?: Date;
    endTime?: string | null;
  }
): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new AppError('auth.loginRequired', 'auth/not-authenticated');
    }

    // Convert Date objects to ISO strings for JSON serialization
    const updatePayload: Record<string, any> = {};
    
    if (typeof updates.title === 'string' && updates.title.trim().length > 0) {
      updatePayload.title = updates.title.trim();
    }
    if (typeof updates.content === 'string' && updates.content.trim().length > 0) {
      updatePayload.content = updates.content.trim();
    }
    if (typeof updates.type === 'string') {
      updatePayload.type = updates.type;
    }
    if (typeof updates.isPinned === 'boolean') {
      updatePayload.isPinned = updates.isPinned;
    }
    if (updates.startDate instanceof Date) {
      updatePayload.startDate = updates.startDate.toISOString();
    } else if (updates.startDate === null || (updates.startDate === undefined && Object.keys(updates).includes('startDate'))) {
      updatePayload.startDate = null;
    }
    if (updates.startTime !== undefined) {
      updatePayload.startTime = updates.startTime;
    }
    if (updates.endDate instanceof Date) {
      updatePayload.endDate = updates.endDate.toISOString();
    }
    if (updates.endTime !== undefined) {
      updatePayload.endTime = updates.endTime;
    }

    const updateFn = httpsCallable<{ announcementId: string; updates: Record<string, any> }, { ok: boolean }>(
      functions,
      'updateAnnouncement'
    );
    await updateFn({ announcementId: id, updates: updatePayload });
  } catch (error: any) {
    // Map Firebase errors to AppError
    if (error instanceof AppError) {
      throw error;
    }
    if (error?.code === 'permission-denied') {
      throw new AppError('announcements.permissionDenied', 'permission-denied');
    }
    if (error?.code === 'not-found') {
      throw new AppError('announcements.notFound', 'not-found');
    }
    if (error?.message?.includes('Insufficient role')) {
      throw new AppError('announcements.insufficientRole', 'permission-denied');
    }
    throw new AppError(
      error?.message || 'announcements.updateFailed',
      error?.code || 'unknown'
    );
  }
}

/**
 * Deletes an announcement via Cloud Function.
 * The Cloud Function validates the user's role and ensures they have permission to delete.
 * Only admin, housing_company, property_manager, and maintenance users can delete announcements.
 * 
 * @async
 * @function deleteAnnouncement
 * @param {string} id - The announcement document ID to delete
 * @returns {Promise<void>}
 * @throws {AppError} If user is not authenticated
 * @throws {AppError} With code 'permission-denied' if user lacks deletion rights or has insufficient role
 * @throws {AppError} With code 'not-found' if announcement does not exist
 * 
 * @example
 * try {
 *   await deleteAnnouncement("ann_123");
 *   console.log("Announcement deleted");
 * } catch (error) {
 *   if (error.code === 'permission-denied') {
 *     console.log("You cannot delete this announcement");
 *   }
 * }
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new AppError('auth.loginRequired', 'auth/not-authenticated');
    }

    const deleteAnnouncementFn = httpsCallable(functions, 'deleteAnnouncement');
    await deleteAnnouncementFn({ announcementId: id });
  } catch (error: any) {
    // Map Firebase errors to AppError
    if (error instanceof AppError) {
      throw error;
    }
    if (error?.message?.includes('Insufficient role')) {
      throw new AppError('announcements.insufficientRole', 'permission-denied');
    }
    if (error?.code === 'permission-denied') {
      throw new AppError('announcements.permissionDenied', 'permission-denied');
    }
    if (error?.code === 'not-found') {
      throw new AppError('announcements.notFound', 'not-found');
    }
    throw new AppError(
      error?.message || 'announcements.deleteFailed',
      error?.code || 'unknown'
    );
  }
}

/**
 * Convenience alias for getAnnouncementById.
 * Provides an alternative function name for semantic clarity when the intent is to retrieve a single announcement.
 * 
 * @function getAnnouncement
 * @param {string} id - The announcement document ID
 * @returns {Promise<Announcement | null>} The announcement object if found, null otherwise
 * 
 * @see getAnnouncementById
 */
export const getAnnouncement = getAnnouncementById;

/**
 * Uploads an announcement attachment (image or PDF) to Firebase Storage.
 * Stores files in announcement-specific folders for easy organization and cleanup.
 * Uses Cloud Function to handle upload with role-based authorization.
 * 
 * @async
 * @function uploadAnnouncementAttachment
 * @param {UploadAttachmentParams} params - File upload parameters
 * @param {string} params.fileName - Original filename with extension
 * @param {string} params.mimeType - MIME type (image/jpeg, image/png, application/pdf)
 * @param {number} params.size - File size in bytes
 * @param {string} params.base64 - Base64 encoded file content
 * @returns {Promise<UploadAttachmentResponse>} Upload result with attachment ID and download URL
 * @throws {AppError} If upload fails or file validation fails
 * 
 * @example
 * const response = await uploadAnnouncementAttachment({
 *   fileName: 'document.pdf',
 *   mimeType: 'application/pdf',
 *   size: 1024000,
 *   base64: 'JVBERi0xLjQK...'
 * });
 * // Use response.attachmentId when creating announcement
 */
export async function uploadAnnouncementAttachment(params: UploadAttachmentParams): Promise<UploadAttachmentResponse> {
  try {
    console.log('=== uploadAnnouncementAttachment START ===');
    
    const user = getCurrentUser();
    console.log('getCurrentUser result:', user ? `uid=${user.uid}` : 'null');
    
    if (!user) {
      throw new AppError('auth.loginRequired', 'auth/not-authenticated');
    }

    console.log('uploadAnnouncementAttachment - uploading with params:', {
      fileName: params.fileName,
      size: params.size,
      mimeType: params.mimeType,
      base64Length: params.base64.length,
    });
    
    console.log('Creating httpsCallable...');
    const uploadFn = httpsCallable<UploadAttachmentParams, UploadAttachmentResponse>(
      functions,
      'uploadAnnouncementAttachment'
    );
    console.log('httpsCallable created successfully');
    
    console.log('uploadAnnouncementAttachment - calling Cloud Function...');
    const result = await uploadFn(params);
    console.log('uploadAnnouncementAttachment - success:', result.data);
    return result.data;
  } catch (error: any) {
    console.error('=== uploadAnnouncementAttachment ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    console.error('Full error:', error);
    console.error('Error details:', {
      code: error?.code,
      message: error?.message,
      customData: error?.customData,
    });
    
    if (error instanceof AppError) {
      throw error;
    }
    if (error?.code === 'permission-denied') {
      throw new AppError('announcements.uploadPermissionDenied', 'permission-denied');
    }
    if (error?.code === 'invalid-argument') {
      throw new AppError('announcements.invalidFile', 'invalid-argument');
    }
    if (error?.message?.includes('size')) {
      throw new AppError('announcements.fileTooLarge', 'invalid-argument');
    }
    throw new AppError(
      error?.message || 'announcements.uploadFailed',
      error?.code || 'unknown'
    );
  }
}

/**
 * Updates an announcement with new or modified attachments.
 * Attaches previously uploaded files and removes specified attachments.
 * Uses Cloud Function for role-based authorization.
 * 
 * @async
 * @function updateAnnouncementWithAttachments
 * @param {string} announcementId - The announcement document ID
 * @param {string[]} attachmentIds - Array of attachment IDs to add (from uploadAnnouncementAttachment)
 * @param {string[]} [removeAttachmentIds] - Optional array of attachment IDs to remove
 * @returns {Promise<void>}
 * @throws {AppError} If announcement not found or user lacks permission
 * 
 * @example
 * // Add new attachments
 * await updateAnnouncementWithAttachments('ann_123', ['attach_1', 'attach_2']);
 * 
 * // Add and remove attachments
 * await updateAnnouncementWithAttachments('ann_123', ['attach_3'], ['attach_1']);
 */
export async function updateAnnouncementWithAttachments(
  announcementId: string,
  attachmentIds: string[],
  removeAttachmentIds?: string[]
): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new AppError('auth.loginRequired', 'auth/not-authenticated');
    }

    const params: UpdateAnnouncementAttachmentsParams = {
      announcementId,
      attachmentIds,
      removeAttachmentIds,
    };

    const updateFn = httpsCallable<UpdateAnnouncementAttachmentsParams, { ok: boolean }>(
      functions,
      'updateAnnouncementWithAttachments'
    );
    await updateFn(params);
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error?.code === 'permission-denied') {
      throw new AppError('announcements.permissionDenied', 'permission-denied');
    }
    if (error?.code === 'not-found') {
      throw new AppError('announcements.notFound', 'not-found');
    }
    throw new AppError(
      error?.message || 'announcements.updateAttachmentsFailed',
      error?.code || 'unknown'
    );
  }
}

/**
 * Delete an announcement attachment file from Storage.
 * Removes the file without touching the announcement document.
 * Used when user removes attachments before announcement creation.
 * 
 * @param {string} attachmentId - Attachment ID to delete
 * @returns {Promise<void>}
 * @throws {AppError} If deletion fails
 */
export async function deleteAnnouncementAttachmentFile(attachmentId: string): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new AppError('auth.loginRequired', 'auth/not-authenticated');
    }

    const userProfile = await getUserProfile();
    if (!userProfile) {
      throw new AppError('profile.notFound', 'profile/not-found');
    }

    // Call Cloud Function to delete the file
    const deleteFn = httpsCallable<
      { attachmentId: string },
      { ok: boolean }
    >(functions, 'deleteAnnouncementAttachmentFile');

    await deleteFn({ attachmentId });
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Delete attachment file error:', error);
    // Don't throw error if deletion fails - file will be cleaned up later
  }
}

