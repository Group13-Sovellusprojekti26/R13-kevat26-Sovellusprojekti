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
import { FaultReport, CreateFaultReportInput } from '../models/FaultReport';
import { FaultReportStatus } from '../models/enums';

const COLLECTION_NAME = 'faultReports';

/**
 * Get all fault reports for a specific building
 */
export async function getFaultReportsByBuilding(buildingId: string): Promise<FaultReport[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('buildingId', '==', buildingId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate(),
    })) as FaultReport[];
  } catch (error) {
    console.error('Error fetching fault reports:', error);
    throw error;
  }
}

/**
 * Get fault reports created by a specific user
 */
export async function getFaultReportsByUser(userId: string): Promise<FaultReport[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate(),
    })) as FaultReport[];
  } catch (error) {
    console.error('Error fetching user fault reports:', error);
    throw error;
  }
}

/**
 * Get a single fault report by ID
 */
export async function getFaultReportById(id: string): Promise<FaultReport | null> {
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
      resolvedAt: data.resolvedAt?.toDate(),
    } as FaultReport;
  } catch (error) {
    console.error('Error fetching fault report:', error);
    throw error;
  }
}

/**
 * Create a new fault report
 */
export async function createFaultReport(
  userId: string, 
  input: CreateFaultReportInput
): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...input,
      userId,
      status: FaultReportStatus.OPEN,
      createdAt: now,
      updatedAt: now,
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating fault report:', error);
    throw error;
  }
}

/**
 * Update fault report status
 */
export async function updateFaultReportStatus(
  id: string, 
  status: FaultReportStatus
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updates: any = {
      status,
      updatedAt: Timestamp.now(),
    };
    
    if (status === FaultReportStatus.RESOLVED || status === FaultReportStatus.CLOSED) {
      updates.resolvedAt = Timestamp.now();
    }
    
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating fault report status:', error);
    throw error;
  }
}
