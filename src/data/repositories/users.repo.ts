import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { getCurrentUser } from '../../features/auth/services/auth.service';
import { UserProfile } from '../models/UserProfile';

const tsToDate = (ts?: Timestamp) =>
  ts instanceof Timestamp ? ts.toDate() : new Date();

export async function getUserProfile(): Promise<UserProfile | null> {
  const user = getCurrentUser();
  if (!user) return null;

  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) return null;

  const d = snap.data();

  return {
    id: user.uid,
    email: d.email,
    firstName: d.firstName,
    lastName: d.lastName,
    role: d.role,

    buildingId: d.buildingId,
    housingCompanyId: d.housingCompanyId,

    apartmentNumber: d.apartmentNumber,
    phone: d.phone,
    photoUrl: d.photoUrl,

    createdAt: tsToDate(d.createdAt),
    updatedAt: tsToDate(d.updatedAt),
  };
}
