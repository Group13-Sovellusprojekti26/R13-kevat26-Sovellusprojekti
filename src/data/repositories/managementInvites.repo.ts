import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebase';
import { AppError, logError } from '../../shared/utils/errors';

/**
 * Management invite code data
 */
export interface ManagementInvite {
  id: string;
  inviteCode: string;
  isUsed: boolean;
  isExpired: boolean;
  expiresAt?: string;
  createdAt?: string;
}

/**
 * Validated management invite data returned from validation
 */
export interface ValidatedManagementInviteData {
  inviteId: string;
  housingCompanyId: string;
  housingCompanyName: string;
}

/**
 * Generates an invite code for property management
 * Only accessible by housing_company role
 * Uses Cloud Function for privileged operation
 */
export async function generateManagementInviteCode(): Promise<{ 
  inviteCode: string; 
  expiresAt: string;
}> {
  try {
    const fn = httpsCallable<
      Record<string, never>,
      { inviteCode: string; expiresAt: string }
    >(functions, 'generateManagementInviteCode');
    const result = await fn({});
    return result.data;
  } catch (error: any) {
    logError(error, 'Generate management invite code');
    throw new AppError('housingCompany.management.generateError', error?.code, error);
  }
}

/**
 * Validates a management invite code
 * Does not require authentication - used on registration screen
 */
export async function validateManagementInviteCode(
  inviteCode: string
): Promise<ValidatedManagementInviteData> {
  try {
    const fn = httpsCallable<
      { inviteCode: string },
      ValidatedManagementInviteData
    >(functions, 'validateManagementInviteCode');
    const result = await fn({ inviteCode });
    return result.data;
  } catch (error: any) {
    logError(error, 'Validate management invite code');
    throw new AppError('auth.invalidInviteCode', error?.code, error);
  }
}

/**
 * Joins with a management invite code
 * Creates user account and profile with maintenance role
 */
export async function joinWithManagementInviteCode(input: {
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
    >(functions, 'joinWithManagementInviteCode');
    await fn(input);
  } catch (error: any) {
    logError(error, 'Join with management invite code');
    throw new AppError('auth.registerError', error?.code, error);
  }
}
