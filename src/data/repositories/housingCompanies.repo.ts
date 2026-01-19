import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebase';
import { 
  HousingCompany, 
  CreateHousingCompanyInput,
  ValidatedInviteData,
  RegisterWithInviteInput,
} from '../models/HousingCompany';
import { AppError, logError } from '../../shared/utils/errors';

/**
 * Maps Firestore data to HousingCompany model
 */
function mapHousingCompany(id: string, data: any): HousingCompany {
  return {
    id,
    name: data.name,
    address: data.address,
    city: data.city,
    postalCode: data.postalCode,
    email: data.email,
    createdByAdminId: data.createdByAdminId,
    isActive: data.isActive,
    isRegistered: data.isRegistered ?? false,
    userId: data.userId,
    contactPerson: data.contactPerson,
    phone: data.phone,
    inviteCode: data.inviteCode,
    inviteCodeExpiresAt: data.inviteCodeExpiresAt?.toDate(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Creates a new housing company (admin only)
 * Creates only the housing company document, no user account yet
 * User account is created when housing company uses invite code
 * Uses Cloud Function for privileged operation
 */
export async function createHousingCompany(
  input: CreateHousingCompanyInput
): Promise<{ id: string }> {
  try {
    const fn = httpsCallable<
      CreateHousingCompanyInput,
      { id: string }
    >(functions, 'createHousingCompany');
    const result = await fn(input);
    return { id: result.data.id };
  } catch (error: any) {
    logError(error, 'Create housing company');
    throw new AppError('admin.createCompanyError', error?.code, error);
  }
}

/**
 * Generates an invite code for a housing company (admin only)
 * Uses Cloud Function for privileged operation
 */
export async function generateInviteCode(
  housingCompanyId: string
): Promise<{ inviteCode: string; expiresAt: string }> {
  try {
    const fn = httpsCallable<
      { housingCompanyId: string },
      { inviteCode: string; expiresAt: string }
    >(functions, 'generateInviteCode');
    const result = await fn({ housingCompanyId });
    return result.data;
  } catch (error: any) {
    logError(error, 'Generate invite code');
    throw new AppError('admin.generateInviteError', error?.code, error);
  }
}

/**
 * Gets all housing companies created by the current admin
 * Direct Firestore read with Security Rules
 */
export async function getHousingCompaniesByAdmin(
  adminId: string
): Promise<HousingCompany[]> {
  try {
    const q = query(
      collection(db, 'housingCompanies'),
      where('createdByAdminId', '==', adminId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => mapHousingCompany(doc.id, doc.data()));
  } catch (error: any) {
    logError(error, 'Get housing companies by admin');
    throw new AppError('admin.getCompaniesError', error?.code, error);
  }
}

/**
 * Gets a single housing company by ID
 * Direct Firestore read with Security Rules
 */
export async function getHousingCompanyById(
  id: string
): Promise<HousingCompany | null> {
  try {
    const docRef = doc(db, 'housingCompanies', id);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return mapHousingCompany(snapshot.id, snapshot.data());
  } catch (error: any) {
    logError(error, 'Get housing company by ID');
    throw new AppError('admin.getCompanyError', error?.code, error);
  }
}

/**
 * Joins a housing company using an invite code
 * Uses Cloud Function to validate code and create user profile
 */
export async function joinWithInviteCode(input: {
  inviteCode: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  buildingId: string;
  apartmentNumber?: string;
  phone?: string;
}): Promise<{ ok: boolean; housingCompanyId: string }> {
  try {
    const fn = httpsCallable<typeof input, { ok: boolean; housingCompanyId: string }>(
      functions,
      'joinWithInviteCode'
    );
    const result = await fn(input);
    return result.data;
  } catch (error: any) {
    logError(error, 'Join with invite code');
    throw new AppError('auth.inviteCodeError', error?.code, error);
  }
}

/**
 * Validates an invite code and returns housing company details
 * Does not require authentication - used on login screen
 */
export async function validateInviteCode(
  inviteCode: string
): Promise<ValidatedInviteData> {
  try {
    const fn = httpsCallable<
      { inviteCode: string },
      ValidatedInviteData
    >(functions, 'validateInviteCode');
    const result = await fn({ inviteCode });
    return result.data;
  } catch (error: any) {
    logError(error, 'Validate invite code');
    throw new AppError('auth.invalidInviteCode', error?.code, error);
  }
}

/**
 * Registers housing company with invite code
 * Creates Firebase Auth account and user profile
 * Does not require prior authentication
 */
export async function registerWithInviteCode(
  input: RegisterWithInviteInput
): Promise<{ userId: string; housingCompanyId: string }> {
  try {
    const fn = httpsCallable<
      RegisterWithInviteInput,
      { userId: string; housingCompanyId: string }
    >(functions, 'registerWithInviteCode');
    const result = await fn(input);
    return result.data;
  } catch (error: any) {
    logError(error, 'Register with invite code');
    throw new AppError('auth.registerError', error?.code, error);
  }
}

/**
 * Deletes a housing company
 * Only accessible by admin who created the company
 * Uses Cloud Function for privileged operation
 */
export async function deleteHousingCompany(
  housingCompanyId: string
): Promise<void> {
  try {
    const fn = httpsCallable<
      { housingCompanyId: string },
      { ok: boolean }
    >(functions, 'deleteHousingCompany');
    await fn({ housingCompanyId });
  } catch (error: any) {
    logError(error, 'Delete housing company');
    throw new AppError('admin.deleteCompanyError', error?.code, error);
  }
}
