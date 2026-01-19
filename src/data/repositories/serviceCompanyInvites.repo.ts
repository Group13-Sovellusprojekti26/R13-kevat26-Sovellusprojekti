import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebase';
import { AppError, logError } from '../../shared/utils/errors';

/**
 * Service company invite code data
 */
export interface ServiceCompanyInvite {
  id: string;
  inviteCode: string;
  isUsed: boolean;
  isExpired: boolean;
  expiresAt?: string;
  createdAt?: string;
}

/**
 * Validated service company invite data returned from validation
 */
export interface ValidatedServiceCompanyInviteData {
  inviteId: string;
  housingCompanyId: string;
  housingCompanyName: string;
}

/**
 * Generates an invite code for service company
 * Only accessible by housing_company role
 * Uses Cloud Function for privileged operation
 */
export async function generateServiceCompanyInviteCode(): Promise<{ 
  inviteCode: string; 
  expiresAt: string;
}> {
  try {
    const fn = httpsCallable<
      Record<string, never>,
      { inviteCode: string; expiresAt: string }
    >(functions, 'generateServiceCompanyInviteCode');
    const result = await fn({});
    return result.data;
  } catch (error: any) {
    logError(error, 'Generate service company invite code');
    throw new AppError('housingCompany.serviceCompany.generateError', error?.code, error);
  }
}

/**
 * Validates a service company invite code
 * Does not require authentication - used on registration screen
 */
export async function validateServiceCompanyInviteCode(
  inviteCode: string
): Promise<ValidatedServiceCompanyInviteData> {
  try {
    const fn = httpsCallable<
      { inviteCode: string },
      ValidatedServiceCompanyInviteData
    >(functions, 'validateServiceCompanyInviteCode');
    const result = await fn({ inviteCode });
    return result.data;
  } catch (error: any) {
    logError(error, 'Validate service company invite code');
    throw new AppError('auth.invalidInviteCode', error?.code, error);
  }
}

/**
 * Joins with a service company invite code
 * Creates user account and profile with service_company role
 */
export async function joinWithServiceCompanyInviteCode(input: {
  inviteCode: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  companyName?: string;
}): Promise<void> {
  try {
    const fn = httpsCallable<
      typeof input,
      { ok: boolean; housingCompanyId: string }
    >(functions, 'joinWithServiceCompanyInviteCode');
    await fn(input);
  } catch (error: any) {
    logError(error, 'Join with service company invite code');
    throw new AppError('auth.registerError', error?.code, error);
  }
}
