import { AppError } from '../../shared/utils/errors';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { functions, db } from '../firebase/firebase';
import { Announcement, CreateAnnouncementInput } from '../models/Announcement';
import { AnnouncementType } from '../models/enums';
import { getCurrentUser } from '../../features/auth/services/auth.service';
import { timestampToDate } from '../../shared/utils/firebase';

// Map Firestore document to Announcement
// Firestore Announcement data type
interface FirestoreAnnouncementData {
  buildingId?: string;
  audienceBuildingId?: string;
  createdBy?: string;
  authorId?: string;
  authorName?: string;
  type: AnnouncementType | string;
  title: string;
  content: string;
  imageUrls?: string[];
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
    buildingId: data.buildingId || data.audienceBuildingId || '',
    authorId: data.createdBy || data.authorId || '',
    authorName: data.authorName || '',
    type,
    title: data.title,
    content: data.content,
    imageUrls: data.imageUrls || [],
    createdAt: timestampToDate(data.createdAt) as Date,
    updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) as Date : timestampToDate(data.createdAt) as Date,
    expiresAt: data.expiresAt ? timestampToDate(data.expiresAt) : undefined,
    isPinned: data.isPinned || false,
  };
};

/**
 * Get all announcements for a specific building (direct Firestore access)
 */
export async function getAnnouncementsByBuilding(buildingId: string): Promise<Announcement[]> {
  const user = getCurrentUser();
  if (!user) {
    throw new AppError('auth.loginRequired', 'auth/not-authenticated');
  }

  const q = query(
    collection(db, 'announcements'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  
  // Filter client-side for building-specific announcements
  // (announcements with no audienceBuildingId are for all buildings)
  return snapshot.docs
    .map(docSnap => mapAnnouncement(docSnap.id, docSnap.data() as FirestoreAnnouncementData))
    .filter(a => !a.buildingId || a.buildingId === buildingId);
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
 * Create a new announcement (via Cloud Function - admin only)
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<string> {
  const fn = httpsCallable<
    { title: string; content: string; audienceBuildingId?: string },
    { id: string }
  >(functions, 'publishAnnouncement');
  const res = await fn({
    title: input.title,
    content: input.content,
    audienceBuildingId: input.buildingId,
  });
  return res.data.id;
}

/**
 * Delete announcement (via Cloud Function - admin only)
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  const fn = httpsCallable<{ announcementId: string }, { ok: boolean }>(
    functions,
    'deleteAnnouncement'
  );
  await fn({ announcementId: id });
}
