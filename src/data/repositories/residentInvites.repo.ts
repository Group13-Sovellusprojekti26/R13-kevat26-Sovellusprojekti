import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebase';
import { AppError, logError } from '../../shared/utils/errors';

/**
 * Resident invite code data
 */
export interface ResidentInvite {
  id: string;
  inviteCode: string;
  buildingId: string;
  apartmentNumber: string;
  isUsed: boolean;
  isExpired: boolean;
  expiresAt?: string;
  createdAt?: string;
}

/**
 * Validated resident invite data returned from validation
 */
export interface ValidatedResidentInviteData {
  inviteId: string;
  housingCompanyId: string;
  housingCompanyName: string;
  buildingId: string;
  apartmentNumber: string;
}

/**
 * Generates an invite code for a resident
 * Only accessible by housing_company role
 * Uses Cloud Function for privileged operation
 */
export async function generateResidentInviteCode(
  buildingId: string,
  apartmentNumber: string
): Promise<{ inviteCode: string; expiresAt: string; buildingId: string; apartmentNumber: string }> {
  try {
    const fn = httpsCallable<
      { buildingId: string; apartmentNumber: string },
      { inviteCode: string; expiresAt: string; buildingId: string; apartmentNumber: string }
    >(functions, 'generateResidentInviteCode');
    const result = await fn({ buildingId, apartmentNumber });
    return result.data;
  } catch (error: any) {
    logError(error, 'Generate resident invite code');
    throw new AppError('housingCompany.residents.generateError', error?.code, error);
  }
}

/**
 * Gets all resident invite codes for the housing company
 * Only accessible by housing_company role
 */
export async function getResidentInviteCodes(): Promise<ResidentInvite[]> {
  try {
    const fn = httpsCallable<
      Record<string, never>,
      { invites: ResidentInvite[] }
    >(functions, 'getResidentInviteCodes');
    const result = await fn({});
    return result.data.invites;
  } catch (error: any) {
    logError(error, 'Get resident invite codes');
    throw new AppError('housingCompany.residents.generateError', error?.code, error);
  }
}

/**
 * Validates a resident invite code
 * Does not require authentication - used on login screen
 */
export async function validateResidentInviteCode(
  inviteCode: string
): Promise<ValidatedResidentInviteData> {
  try {
    const fn = httpsCallable<
      { inviteCode: string },
      ValidatedResidentInviteData
    >(functions, 'validateResidentInviteCode');
    const result = await fn({ inviteCode });
    return result.data;
  } catch (error: any) {
    logError(error, 'Validate resident invite code');
    throw new AppError('auth.invalidInviteCode', error?.code, error);
  }
}

/**
 * Joins with a resident invite code
 * Creates user account and profile with pre-filled apartment info
 */
export async function joinWithResidentInviteCode(input: {
  inviteCode: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<{ ok: boolean; housingCompanyId: string }> {
  try {
    const fn = httpsCallable<typeof input, { ok: boolean; housingCompanyId: string }>(
      functions,
      'joinWithResidentInviteCode'
    );
    const result = await fn(input);
    return result.data;
  } catch (error: any) {
    logError(error, 'Join with resident invite code');
    throw new AppError('auth.inviteCodeError', error?.code, error);
  }
}

/**
 * Deletes a resident invite and associated user if exists
 * Only accessible by housing_company role
 */
export async function deleteResidentInvite(inviteId: string): Promise<void> {
  try {
    const fn = httpsCallable<
      { inviteId: string },
      { ok: boolean }
    >(functions, 'deleteResidentInvite');
    await fn({ inviteId });
  } catch (error: any) {
    logError(error, 'Delete resident invite');
    throw new AppError('housingCompany.residents.deleteError', error?.code, error);
  }
}
