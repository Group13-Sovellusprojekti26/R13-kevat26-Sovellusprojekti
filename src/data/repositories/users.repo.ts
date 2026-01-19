import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebase';
import { getCurrentUser } from '../../features/auth/services/auth.service';
import { UserProfile } from '../models/UserProfile';
import { UserRole } from '../models/enums';
import { AppError, logError } from '../../shared/utils/errors';
import { timestampToDate } from '../../shared/utils/firebase';

// Firestore UserProfile data type
interface FirestoreUserProfileData {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | string;
  buildingId: string;
  housingCompanyId: string;
  apartmentNumber?: string;
  phone?: string;
  photoUrl?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

const isUserRole = (role: string): role is UserRole =>
  Object.values(UserRole).includes(role as UserRole);

export async function getUserProfile(): Promise<UserProfile | null> {
  const user = getCurrentUser();
  if (!user) return null;

  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) return null;

  const d = snap.data() as FirestoreUserProfileData;
  if (!d.createdAt || !d.email || !d.firstName || !d.lastName || !d.role) {
    throw new AppError('profile.invalidData', 'profile/invalid-data');
  }

  const role = isUserRole(d.role as string) ? (d.role as UserRole) : null;
  if (!role) {
    throw new AppError('profile.invalidRole', 'profile/invalid-role');
  }

  // Admin, housing_company, maintenance and service_company don't need buildingId
  // Housing company role doesn't need buildingId as they manage the whole company
  // Maintenance (property manager) doesn't have a specific building
  // Service company doesn't have a specific building
  if (
    role !== UserRole.ADMIN && 
    role !== UserRole.HOUSING_COMPANY && 
    role !== UserRole.MAINTENANCE &&
    role !== UserRole.SERVICE_COMPANY &&
    !d.buildingId
  ) {
    throw new AppError('profile.invalidData', 'profile/invalid-data');
  }

  // All non-admin roles need housingCompanyId
  if (role !== UserRole.ADMIN && !d.housingCompanyId) {
    throw new AppError('profile.invalidData', 'profile/invalid-data');
  }

  return {
    id: user.uid,
    email: d.email,
    firstName: d.firstName,
    lastName: d.lastName,
    role,
    buildingId: d.buildingId || '',
    housingCompanyId: d.housingCompanyId || '',
    apartmentNumber: d.apartmentNumber,
    phone: d.phone,
    photoUrl: d.photoUrl,
    createdAt: timestampToDate(d.createdAt)!,
    updatedAt: d.updatedAt ? timestampToDate(d.updatedAt)! : timestampToDate(d.createdAt)!,
  };
}

/**
 * Deletes the current resident account (auth + profile + related data)
 * Uses Cloud Function for privileged operation
 */
export async function deleteResidentAccount(): Promise<void> {
  try {
    const fn = httpsCallable<unknown, { ok: boolean }>(functions, 'deleteResidentAccount');
    await fn({});
  } catch (error: any) {
    logError(error, 'Delete resident account');
    throw new AppError('resident.dashboard.deleteAccountError', error?.code, error);
  }
}
