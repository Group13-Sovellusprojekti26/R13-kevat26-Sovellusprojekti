import { httpsCallable } from 'firebase/functions';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc, 
  doc,
  Timestamp 
} from 'firebase/firestore';
import { functions, db } from '../firebase/firebase';
import { Announcement, CreateAnnouncementInput } from '../models/Announcement';
import { getCurrentUser } from '../../features/auth/services/auth.service';

// Convert Firestore Timestamp to Date
const timestampToDate = (timestamp: Timestamp | undefined): Date | undefined => {
  return timestamp instanceof Timestamp ? timestamp.toDate() : undefined;
};

// Map Firestore document to Announcement
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAnnouncement = (id: string, data: any): Announcement => ({
  id,
  buildingId: data.buildingId || data.audienceBuildingId || '',
  authorId: data.createdBy || data.authorId,
  authorName: data.authorName || '',
  type: data.type,
  title: data.title,
  content: data.content,
  imageUrls: data.imageUrls || [],
  createdAt: timestampToDate(data.createdAt) as Date,
  updatedAt: timestampToDate(data.updatedAt) || timestampToDate(data.createdAt) as Date,
  expiresAt: timestampToDate(data.expiresAt),
  isPinned: data.isPinned || false,
});

/**
 * Get all announcements for a specific building (direct Firestore access)
 */
export async function getAnnouncementsByBuilding(buildingId: string): Promise<Announcement[]> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const q = query(
    collection(db, 'announcements'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  
  // Filter client-side for building-specific announcements
  // (announcements with no audienceBuildingId are for all buildings)
  return snapshot.docs
    .map(doc => mapAnnouncement(doc.id, doc.data()))
    .filter(a => !a.buildingId || a.buildingId === buildingId);
}

/**
 * Get a single announcement by ID (direct Firestore access)
 */
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const docRef = doc(db, 'announcements', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return mapAnnouncement(docSnap.id, docSnap.data());
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
