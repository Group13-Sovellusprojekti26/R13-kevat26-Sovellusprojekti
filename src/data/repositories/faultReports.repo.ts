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

import { AppError, logError } from '../../shared/utils/errors';
import { timestampToDate } from '../../shared/utils/firebase';
import { functions, db } from '../firebase/firebase';
import { FaultReport, CreateFaultReportInput } from '../models/FaultReport';
import { FaultReportStatus, UrgencyLevel } from '../models/enums';
import { getCurrentUser } from '../../features/auth/services/auth.service';
import { getUserProfile } from './users.repo';

interface FirestoreFaultReportData {
  createdBy: string;
  buildingId: string;
  housingCompanyId: string;
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
    !data.createdBy ||
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

  return {
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
    where('createdBy', '==', userProfile.id),
    where('housingCompanyId', '==', userProfile.housingCompanyId),
    orderBy('createdAt', 'desc')
  );

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
    buildingId: userProfile.buildingId,
    housingCompanyId: userProfile.housingCompanyId,
    createdBy: userProfile.id,
    status: FaultReportStatus.OPEN,
    imageUrls: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (input.imageUris?.length) {
    const urls = await uploadImages(input.imageUris, docRef.id);
    await updateDoc(docRef, {
      imageUrls: urls,
      updatedAt: serverTimestamp(),
    });
  }

  return docRef.id;
}

export async function updateFaultReportStatus(id: string, status: FaultReportStatus): Promise<void> {
  const callable = httpsCallable<
    { faultReportId: string; status: FaultReportStatus; comment?: string },
    { ok: boolean }
  >(functions, 'updateFaultReportStatus');

  await callable({ faultReportId: id, status });
}

async function uploadImages(dataUrls: string[], reportId: string): Promise<string[]> {
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
        imageIndex: index,
      });

      return result.data.url;
    } catch (error: unknown) {
      logError(error, 'Upload fault report image');
      throw new AppError('faults.imageUploadFailed', 'fault-report/image-upload-failed');
    }
  });

  return Promise.all(uploads);
}
