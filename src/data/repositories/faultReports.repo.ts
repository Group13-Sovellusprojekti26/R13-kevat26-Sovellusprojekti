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
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { functions, db } from '../firebase/firebase';
import { FaultReport, CreateFaultReportInput } from '../models/FaultReport';
import { FaultReportStatus } from '../models/enums';
import { getCurrentUser } from '../../features/auth/services/auth.service';

// Convert Firestore Timestamp to Date
const timestampToDate = (timestamp: Timestamp | undefined): Date | undefined => {
  return timestamp instanceof Timestamp ? timestamp.toDate() : undefined;
};

// Map Firestore document to FaultReport
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapFaultReport = (id: string, data: any): FaultReport => ({
  id,
  userId: data.createdBy || data.userId,
  buildingId: data.buildingId,
  apartmentNumber: data.apartmentNumber,
  title: data.title,
  description: data.description,
  location: data.location || '',
  status: data.status,
  urgency: data.urgency,
  imageUrls: data.images || data.imageUrls || [],
  createdAt: timestampToDate(data.createdAt) as Date,
  updatedAt: timestampToDate(data.updatedAt) as Date,
  resolvedAt: timestampToDate(data.resolvedAt),
  assignedTo: data.assignedTo,
});

/**
 * Get all fault reports for a specific building (direct Firestore access)
 */
export async function getFaultReportsByBuilding(buildingId: string): Promise<FaultReport[]> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const q = query(
    collection(db, 'faultReports'),
    where('buildingId', '==', buildingId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapFaultReport(doc.id, doc.data()));
}

/**
 * Get fault reports created by the current user (direct Firestore access)
 */
export async function getFaultReportsByUser(): Promise<FaultReport[]> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    throw new Error('User profile not found');
  }

  const { housingCompanyId } = userDoc.data();
  if (!housingCompanyId) {
    throw new Error('Housing company ID missing');
  }

  
  const q = query(
    collection(db, 'faultReports'),
    where('housingCompanyId', '==', housingCompanyId),
    where('createdBy', '==', user.uid),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapFaultReport(doc.id, doc.data()));
}


/**
 * Get a single fault report by ID (direct Firestore access)
 */
export async function getFaultReportById(id: string): Promise<FaultReport | null> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const docRef = doc(db, 'faultReports', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return mapFaultReport(docSnap.id, docSnap.data());
}

/**
 * Create a new fault report (direct Firestore access)
 * Security Rules enforce housingCompanyId and createdBy
 */
export async function createFaultReport(
  input: CreateFaultReportInput
): Promise<string> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Get user profile to retrieve housingCompanyId
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);
  
  if (!userDoc.exists()) {
    throw new Error('User profile not found');
  }

  const userData = userDoc.data();
  const housingCompanyId = userData.housingCompanyId;

  if (!housingCompanyId) {
    throw new Error('Housing company ID not found');
  }

  const docRef = await addDoc(collection(db, 'faultReports'), {
    housingCompanyId,
    buildingId: input.buildingId,
    apartmentNumber: input.apartmentNumber || null,
    title: input.title,
    description: input.description,
    location: input.location || '',
    urgency: input.urgency,
    images: input.imageUrls || [],
    status: 'open',
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update fault report status (via Cloud Function - admin/maintenance only)
 */
export async function updateFaultReportStatus(
  id: string, 
  status: FaultReportStatus
): Promise<void> {
  const fn = httpsCallable<{ faultReportId: string; status: FaultReportStatus; comment?: string }>(
    functions,
    'updateFaultReportStatus'
  );
  await fn({ faultReportId: id, status });
}
