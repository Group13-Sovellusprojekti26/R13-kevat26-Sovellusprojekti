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
  updateDoc,
  serverTimestamp,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import { functions, db } from '../firebase/firebase';
import { Announcement, CreateAnnouncementInput } from '../models/Announcement';
import { AnnouncementType } from '../models/enums';
import { getCurrentUser } from '../../features/auth/services/auth.service';
import { getUserProfile } from './users.repo';
import { timestampToDate } from '../../shared/utils/firebase';

// Map Firestore document to Announcement
// Firestore Announcement data type
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
  imageUrls?: string[];
  startDate?: Timestamp;
  startTime?: string;
  endDate?: Timestamp;
  endTime?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  expiresAt?: Timestamp;
  isPinned?: boolean;
}

const isAnnouncementType = (value: string): value is AnnouncementType =>
  Object.values(AnnouncementType).includes(value as AnnouncementType);

const mapAnnouncement = (id: string, data: FirestoreAnnouncementData): Announcement => {
  if (!data.createdAt || !data.title || !data.content || !data.type) {
    throw new AppError('announcements.missingRequiredFields', 'missing-fields');
  }

  const type = isAnnouncementType(data.type as string)
    ? (data.type as AnnouncementType)
    : AnnouncementType.GENERAL;

  return {
    id,
    housingCompanyId: data.housingCompanyId || '',
    authorId: data.createdBy || data.authorId || '',
    authorName: data.authorName || '',
    type,
    title: data.title,
    content: data.content,
    imageUrls: data.imageUrls || [],
    startDate: data.startDate ? timestampToDate(data.startDate) as Date : undefined,
    startTime: data.startTime || undefined,
    endDate: data.endDate ? timestampToDate(data.endDate) as Date : new Date(),
    endTime: data.endTime || undefined,
    createdAt: timestampToDate(data.createdAt) as Date,
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) as Date : timestampToDate(data.createdAt) as Date,
    expiresAt: data.expiresAt ? timestampToDate(data.expiresAt) : undefined,
    isPinned: data.isPinned || false,
  };
};

/**
 * Get all announcements for the housing company (direct Firestore access)
 */
export async function getAnnouncementsByHousingCompany(housingCompanyId: string): Promise<Announcement[]> {
  const user = getCurrentUser();
  if (!user) {
    throw new AppError('auth.loginRequired', 'auth/not-authenticated');
  }

  const q = query(
    collection(db, 'announcements'),
    where('housingCompanyId', '==', housingCompanyId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const announcements = snapshot.docs.map(docSnap => mapAnnouncement(docSnap.id, docSnap.data() as FirestoreAnnouncementData));
  
  // Sort by pinned status first (pinned true comes first), then by createdAt
  return announcements.sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return a.isPinned ? -1 : 1;
  });
}

/**
 * Get a single announcement by ID (direct Firestore access)
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
 * Create a new announcement (Cloud Function)
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<string> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new AppError('auth.loginRequired', 'auth/not-authenticated');
    }

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
      imageUrls: input.imageUrls || [],
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
 * Update an existing announcement (direct Firestore - Security Rules validates role)
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

    const docRef = doc(db, 'announcements', id);
    
    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (typeof updates.title === 'string' && updates.title.trim().length > 0) {
      updateData.title = updates.title.trim();
    }
    if (typeof updates.content === 'string' && updates.content.trim().length > 0) {
      updateData.content = updates.content.trim();
    }
    if (typeof updates.type === 'string') {
      updateData.type = updates.type;
    }
    if (typeof updates.isPinned === 'boolean') {
      updateData.isPinned = updates.isPinned;
    }
    if (updates.startDate instanceof Date) {
      updateData.startDate = updates.startDate;
    } else if (updates.startDate === null || (updates.startDate === undefined && Object.keys(updates).includes('startDate'))) {
      updateData.startDate = null;
    }
    if (updates.startTime !== undefined) {
      updateData.startTime = updates.startTime;
    }
    if (updates.endDate instanceof Date) {
      updateData.endDate = updates.endDate;
    }
    if (updates.endTime !== undefined) {
      updateData.endTime = updates.endTime;
    }

    await updateDoc(docRef, updateData);
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
    throw new AppError(
      error?.message || 'announcements.updateFailed',
      error?.code || 'unknown'
    );
  }
}

/**
 * Delete announcement (Cloud Function)
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
 * Alias for getAnnouncementById for convenience
 */
export const getAnnouncement = getAnnouncementById;
