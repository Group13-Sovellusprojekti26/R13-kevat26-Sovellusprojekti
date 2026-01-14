import { httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { functions, db, storage } from '../firebase/firebase';
import { FaultReport, CreateFaultReportInput } from '../models/FaultReport';
import { FaultReportStatus } from '../models/enums';
import { getCurrentUser } from '../../features/auth/services/auth.service';
import { getUserProfile } from './users.repo';

// -------------------------------------
// Helpers
// -------------------------------------
const timestampToDate = (timestamp?: Timestamp): Date | undefined =>
  timestamp instanceof Timestamp ? timestamp.toDate() : undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapFaultReport = (id: string, data: any): FaultReport => ({
  id,
  userId: data.createdBy,
  buildingId: data.buildingId,
  apartmentNumber: data.apartmentNumber ?? undefined,
  title: data.title,
  description: data.description,
  location: data.location ?? '',
  status: data.status,
  urgency: data.urgency,
  imageUrls: data.imageUrls ?? [],
  createdAt: timestampToDate(data.createdAt)!,
  updatedAt: timestampToDate(data.updatedAt)!,
  resolvedAt: timestampToDate(data.resolvedAt),
  assignedTo: data.assignedTo,
});

// -------------------------------------
// READ
// -------------------------------------
export async function getFaultReportsByUser(): Promise<FaultReport[]> {
  const userProfile = await getUserProfile();
  if (!userProfile) throw new Error('User profile not found');

  const q = query(
    collection(db, 'faultReports'),
    where('createdBy', '==', userProfile.id),
    where('housingCompanyId', '==', userProfile.housingCompanyId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => mapFaultReport(d.id, d.data()));
}

export async function getFaultReportsByBuilding(): Promise<FaultReport[]> {
  const userProfile = await getUserProfile();
  if (!userProfile) throw new Error('User profile not found');

  const q = query(
    collection(db, 'faultReports'),
    where('buildingId', '==', userProfile.buildingId),
    where('housingCompanyId', '==', userProfile.housingCompanyId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => mapFaultReport(d.id, d.data()));
}

export async function getFaultReportById(
  id: string
): Promise<FaultReport | null> {
  const snap = await getDoc(doc(db, 'faultReports', id));
  if (!snap.exists()) return null;
  return mapFaultReport(snap.id, snap.data());
}

// -------------------------------------
// CREATE
// -------------------------------------
export async function createFaultReport(
  input: CreateFaultReportInput
): Promise<string> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const userProfile = await getUserProfile();
  if (!userProfile) throw new Error('User profile not found');

  // 1️⃣ Create Firestore document FIRST
  const docRef = await addDoc(collection(db, 'faultReports'), {
    title: input.title,
    description: input.description,
    location: input.location ?? '',
    urgency: input.urgency,
    apartmentNumber: input.apartmentNumber ?? null,

    buildingId: userProfile.buildingId,
    housingCompanyId: userProfile.housingCompanyId,
    createdBy: userProfile.id,

    status: 'open',
    imageUrls: [],

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2️⃣ Upload images if provided
  if (input.imageUris && input.imageUris.length > 0) {
    const urls = await uploadImages(input.imageUris, docRef.id);

    await updateDoc(docRef, {
      imageUrls: urls,
      updatedAt: serverTimestamp(),
    });
  }

  return docRef.id;
}

// -------------------------------------
// UPDATE (Cloud Function)
// -------------------------------------
export async function updateFaultReportStatus(
  id: string,
  status: FaultReportStatus
): Promise<void> {
  const fn = httpsCallable<{
    faultReportId: string;
    status: FaultReportStatus;
    comment?: string;
  }>(functions, 'updateFaultReportStatus');

  await fn({ faultReportId: id, status });
}

// -------------------------------------
// STORAGE
// -------------------------------------
async function uploadImages(
  uris: string[],
  reportId: string
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < uris.length; i++) {
    const response = await fetch(uris[i]);
    const blob = await response.blob();

    const imageRef = ref(
      storage,
      `faultReports/${reportId}/image_${i}.jpg`
    );

    await uploadBytes(imageRef, blob);
    const url = await getDownloadURL(imageRef);
    urls.push(url);
  }

  return urls;
}
