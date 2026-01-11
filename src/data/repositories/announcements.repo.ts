import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Announcement, CreateAnnouncementInput } from '../models/Announcement';

const COLLECTION_NAME = 'announcements';

/**
 * Get all announcements for a specific building
 */
export async function getAnnouncementsByBuilding(buildingId: string): Promise<Announcement[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('buildingId', '==', buildingId),
      orderBy('isPinned', 'desc'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const now = new Date();
    
    // Filter out expired announcements
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
      }))
      .filter(announcement => 
        !announcement.expiresAt || announcement.expiresAt > now
      ) as Announcement[];
  } catch (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
}

/**
 * Get a single announcement by ID
 */
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
    } as Announcement;
  } catch (error) {
    console.error('Error fetching announcement:', error);
    throw error;
  }
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(
  authorId: string,
  authorName: string,
  input: CreateAnnouncementInput
): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...input,
      authorId,
      authorName,
      isPinned: input.isPinned || false,
      createdAt: now,
      updatedAt: now,
      expiresAt: input.expiresAt ? Timestamp.fromDate(input.expiresAt) : null,
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
}

/**
 * Update announcement
 */
export async function updateAnnouncement(
  id: string,
  updates: Partial<CreateAnnouncementInput>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
}
