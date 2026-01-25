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
  deleteDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { AppError, logError } from '../../shared/utils/errors';
import { timestampToDate } from '../../shared/utils/firebase';
import { functions, db } from '../firebase/firebase';
import { FaultReport, CreateFaultReportInput } from '../models/FaultReport';
import { FaultReportStatus, UrgencyLevel, UserRole } from '../models/enums';
import { getCurrentUser } from '../../features/auth/services/auth.service';
import { getUserProfile } from './users.repo';

interface FirestoreFaultReportData {
  createdBy: string;
  createdByUserId?: string;
  buildingId: string;
  housingCompanyId: string;
  apartmentId?: string;
  apartmentNumber?: string;
  title: string;
  description: string;
  location?: string;
  status: FaultReportStatus;
  urgency: UrgencyLevel;
  imageUrls?: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  resolvedAt?: Timestamp;
  assignedTo?: string;
}

const mapFaultReport = (id: string, data: FirestoreFaultReportData): FaultReport => {
  if (
    !data.createdAt ||
    (!data.createdBy && !data.createdByUserId) ||
    !data.buildingId ||
    !data.title ||
    !data.description ||
    !data.status ||
    !data.urgency
  ) {
    throw new AppError('faults.missingRequiredFields', 'fault-report/missing-fields');
  }

  const createdAt = timestampToDate(data.createdAt);
  if (!createdAt) {
    throw new AppError('faults.invalidTimestamps', 'fault-report/invalid-timestamps');
  }

  const updatedAt = data.updatedAt ? timestampToDate(data.updatedAt) : createdAt;
  const resolvedAt = data.resolvedAt ? timestampToDate(data.resolvedAt) : undefined;
  const createdByUserId = data.createdByUserId ?? data.createdBy;

  return {
    id,
    userId: createdByUserId,
    createdByUserId,
    apartmentId: data.apartmentId ?? data.apartmentNumber ?? undefined,
    buildingId: data.buildingId,
    housingCompanyId: data.housingCompanyId,
    apartmentNumber: data.apartmentNumber ?? undefined,
    title: data.title,
    description: data.description,
    location: data.location ?? '',
    status: data.status,
    urgency: data.urgency,
    imageUrls: data.imageUrls ?? [],
    createdAt,
    updatedAt: updatedAt ?? createdAt,
    resolvedAt,
    assignedTo: data.assignedTo,
  };
};

export async function getFaultReportsByUser(): Promise<FaultReport[]> {
  const userProfile = await getUserProfile();
  if (!userProfile) {
    throw new AppError('profile.notFound', 'profile/not-found');
  }

  const reportsQuery = query(
    collection(db, 'faultReports'),
    where('createdByUserId', '==', userProfile.id),
    where('housingCompanyId', '==', userProfile.housingCompanyId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(reportsQuery);
  return snapshot.docs.map(docSnap => mapFaultReport(docSnap.id, docSnap.data() as FirestoreFaultReportData));
}

export async function getFaultReportsForRole(): Promise<FaultReport[]> {
  const userProfile = await getUserProfile();
  if (!userProfile) {
    throw new AppError('profile.notFound', 'profile/not-found');
  }

  const scope: 'byUser' | 'byHousingCompany' =
    userProfile.role === UserRole.RESIDENT ? 'byUser' : 'byHousingCompany';

  const reportsQuery =
    scope === 'byUser'
      ? query(
          collection(db, 'faultReports'),
          where('createdByUserId', '==', userProfile.id),
          where('housingCompanyId', '==', userProfile.housingCompanyId),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, 'faultReports'),
          where('housingCompanyId', '==', userProfile.housingCompanyId),
          orderBy('createdAt', 'desc')
        );

  console.log('Fault report query', {
    role: userProfile.role,
    housingCompanyId: userProfile.housingCompanyId,
    scope,
    filters:
      scope === 'byUser'
        ? [
            `createdByUserId == ${userProfile.id}`,
            `housingCompanyId == ${userProfile.housingCompanyId}`,
          ]
        : [`housingCompanyId == ${userProfile.housingCompanyId}`],
    orderBy: 'createdAt desc',
  });

  const snapshot = await getDocs(reportsQuery);
  return snapshot.docs.map(docSnap => mapFaultReport(docSnap.id, docSnap.data() as FirestoreFaultReportData));
}

export async function getFaultReportsByBuilding(): Promise<FaultReport[]> {
  const userProfile = await getUserProfile();
  if (!userProfile) {
    throw new AppError('profile.notFound', 'profile/not-found');
  }

  const reportsQuery = query(
    collection(db, 'faultReports'),
    where('buildingId', '==', userProfile.buildingId),
    where('housingCompanyId', '==', userProfile.housingCompanyId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(reportsQuery);
  return snapshot.docs.map(docSnap => mapFaultReport(docSnap.id, docSnap.data() as FirestoreFaultReportData));
}

export async function getFaultReportById(id: string): Promise<FaultReport | null> {
  const snap = await getDoc(doc(db, 'faultReports', id));
  if (!snap.exists()) {
    return null;
  }

  return mapFaultReport(snap.id, snap.data() as FirestoreFaultReportData);
}

export async function createFaultReport(input: CreateFaultReportInput): Promise<string> {
  const user = getCurrentUser();
  if (!user) {
    throw new AppError('auth.loginRequired', 'auth/not-authenticated');
  }

  const userProfile = await getUserProfile();
  if (!userProfile) {
    throw new AppError('profile.notFound', 'profile/not-found');
  }

  const docRef = await addDoc(collection(db, 'faultReports'), {
    title: input.title,
    description: input.description,
    location: input.location ?? '',
    urgency: input.urgency,
    apartmentNumber: input.apartmentNumber ?? null,
    apartmentId: userProfile.apartmentNumber ?? null,
    buildingId: userProfile.buildingId,
    housingCompanyId: userProfile.housingCompanyId,
    createdBy: userProfile.id,
    createdByUserId: userProfile.id,
    status: FaultReportStatus.OPEN,
    imageUrls: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (input.imageUris?.length) {
    try {
      const urls = await uploadImages(input.imageUris, docRef.id, 0);
      await updateDoc(docRef, {
        imageUrls: urls,
        updatedAt: serverTimestamp(),
      });
    } catch (error: unknown) {
      logError(error, 'Create fault report image upload');
    }
  }

  return docRef.id;
}

export async function updateFaultReportDetails(
  id: string,
  params: {
    description?: string;
    imageUris?: string[];
    existingImageUrls?: string[];
  }
): Promise<string[]> {
  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof params.description === 'string') {
    updates.description = params.description;
  }

  let nextImageUrls = params.existingImageUrls ?? [];
  if (params.imageUris?.length) {
    const startIndex = params.existingImageUrls?.length ?? 0;
    const uploadedUrls = await uploadImages(params.imageUris, id, startIndex);
    nextImageUrls = Array.from(new Set([...nextImageUrls, ...uploadedUrls]));
  }
  const hasImageUpdates = params.existingImageUrls !== undefined || (params.imageUris?.length ?? 0) > 0;
  if (hasImageUpdates) {
    updates.imageUrls = nextImageUrls;
  }

  if (Object.keys(updates).length > 1) {
    const updatePayload = updates;
    console.log('Fault report update payload:', updatePayload);
    await updateDoc(doc(db, 'faultReports', id), updatePayload);
  }

  return nextImageUrls;
}

export async function updateFaultReportStatus(id: string, status: FaultReportStatus): Promise<void> {
  const callable = httpsCallable<
    { faultReportId: string; status: FaultReportStatus; comment?: string },
    { ok: boolean }
  >(functions, 'updateFaultReportStatus');

  await callable({ faultReportId: id, status });
}

export async function closeFaultReport(id: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new AppError('auth.loginRequired', 'auth/not-authenticated');
  }

  const userProfile = await getUserProfile();
  if (!userProfile) {
    throw new AppError('profile.notFound', 'profile/not-found');
  }

  const reportRef = doc(db, 'faultReports', id);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) {
    throw new AppError('faults.notFound', 'fault-report/not-found');
  }

  const data = snap.data() as FirestoreFaultReportData;
  if (data.createdByUserId !== userProfile.id || data.housingCompanyId !== userProfile.housingCompanyId) {
    throw new AppError('faults.unauthorized', 'fault-report/unauthorized');
  }

  await updateFaultReportStatus(id, FaultReportStatus.CANCELLED);
}

export async function deleteFaultReport(id: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new AppError('auth.loginRequired', 'auth/not-authenticated');
  }

  const userProfile = await getUserProfile();
  if (!userProfile) {
    throw new AppError('profile.notFound', 'profile/not-found');
  }

  const reportRef = doc(db, 'faultReports', id);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) {
    throw new AppError('faults.notFound', 'fault-report/not-found');
  }

  const data = snap.data() as FirestoreFaultReportData;
  if (data.createdBy !== userProfile.id || data.housingCompanyId !== userProfile.housingCompanyId) {
    throw new AppError('faults.unauthorized', 'fault-report/unauthorized');
  }

  await deleteDoc(reportRef);
}

async function uploadImages(dataUrls: string[], reportId: string, startIndex: number): Promise<string[]> {
  const uploadCallable = httpsCallable<
    { faultReportId: string; imageBase64: string; contentType: string; imageIndex: number },
    { url: string }
  >(functions, 'uploadFaultReportImage');

  const uploads = dataUrls.map(async (dataUrl, index) => {
    try {
      if (!dataUrl.startsWith('data:')) {
        throw new Error('Image must be provided as data URL');
      }

      // Parse data URL: data:image/webp;base64,XXXXX
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid data URL format');
      }

      const contentType = matches[1];
      const imageBase64 = matches[2];

      const result = await uploadCallable({
        faultReportId: reportId,
        imageBase64,
        contentType,
        imageIndex: startIndex + index,
      });

      return result.data.url;
    } catch (error: unknown) {
      logError(error, 'Upload fault report image');
      throw new AppError('faults.imageUploadFailed', 'fault-report/image-upload-failed');
    }
  });

  return Promise.all(uploads);
}
