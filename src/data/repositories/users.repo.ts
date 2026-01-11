import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { functions, db } from '../firebase/firebase';
import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../models/UserProfile';
import { getCurrentUser } from '../../features/auth/services/auth.service';

// Convert Firestore Timestamp to Date
const timestampToDate = (timestamp: Timestamp | undefined): Date | undefined => {
  return timestamp instanceof Timestamp ? timestamp.toDate() : undefined;
};

// Map Firestore document to UserProfile
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapUserProfile = (id: string, data: any): UserProfile => ({
  id,
  email: data.email,
  firstName: data.firstName,
  lastName: data.lastName,
  phone: data.phone,
  role: data.role,
  buildingId: data.buildingId,
  apartmentNumber: data.apartmentNumber,
  photoUrl: data.photoUrl,
  createdAt: timestampToDate(data.createdAt) as Date,
  updatedAt: timestampToDate(data.updatedAt) as Date,
});

/**
 * Get current user's profile (direct Firestore access)
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const docRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return mapUserProfile(docSnap.id, docSnap.data());
}

/**
 * Create a new user profile (via Cloud Function - during signup)
 */
export async function createUserProfile(input: CreateUserProfileInput): Promise<void> {
  const fn = httpsCallable<
    {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      buildingId?: string;
      apartmentNumber?: string;
    },
    { ok: boolean }
  >(functions, 'createUserProfileFn');
  await fn({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    buildingId: input.buildingId,
    apartmentNumber: input.apartmentNumber,
  });
}

/**
 * Update user profile (direct Firestore access for allowed fields)
 * Security Rules prevent changing role, housingCompanyId, and email
 */
export async function updateUserProfile(updates: UpdateUserProfileInput): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const docRef = doc(db, 'users', user.uid);
  
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
  if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.apartmentNumber !== undefined) updateData.apartmentNumber = updates.apartmentNumber;
  if (updates.photoUrl !== undefined) updateData.photoUrl = updates.photoUrl;

  await updateDoc(docRef, updateData);
}

/**
 * Check if user profile exists (direct Firestore access)
 */
export async function userProfileExists(): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) return false;

  const docRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(docRef);
  
  return docSnap.exists();
}
