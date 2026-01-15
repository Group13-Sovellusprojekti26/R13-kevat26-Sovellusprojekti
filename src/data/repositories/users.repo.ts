import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { getCurrentUser } from '../../features/auth/services/auth.service';
import { UserProfile } from '../models/UserProfile';
import { UserRole } from '../models/enums';
import { AppError } from '../../shared/utils/errors';
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
  if (!d.createdAt || !d.email || !d.firstName || !d.lastName || !d.role || !d.buildingId || !d.housingCompanyId) {
    throw new AppError('profile.invalidData', 'profile/invalid-data');
  }

  const role = isUserRole(d.role as string) ? (d.role as UserRole) : null;
  if (!role) {
    throw new AppError('profile.invalidRole', 'profile/invalid-role');
  }

  return {
    id: user.uid,
    email: d.email,
    firstName: d.firstName,
    lastName: d.lastName,
    role,
    buildingId: d.buildingId,
    housingCompanyId: d.housingCompanyId,
    apartmentNumber: d.apartmentNumber,
    phone: d.phone,
    photoUrl: d.photoUrl,
    createdAt: timestampToDate(d.createdAt)!,
    updatedAt: d.updatedAt ? timestampToDate(d.updatedAt)! : timestampToDate(d.createdAt)!,
  };
}
