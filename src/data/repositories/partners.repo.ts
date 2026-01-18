import { functions } from '../firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { AppError } from '../../shared/utils/errors';

export interface PartnerUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
}

export interface ManagementUserResponse {
  exists: boolean;
  user?: PartnerUser;
}

export interface ServiceCompanyUserResponse {
  exists: boolean;
  user?: PartnerUser;
}

/**
 * Get management user info for the housing company
 */
export async function getManagementUser(): Promise<ManagementUserResponse> {
  try {
    const fn = httpsCallable<unknown, ManagementUserResponse>(functions, 'getManagementUser');
    const result = await fn({});
    return result.data;
  } catch (error: any) {
    console.error('Error getting management user:', error);
    throw new AppError(error.message || 'housingCompany.management.getError', 'partners/get-management-error');
  }
}

/**
 * Get service company user info for the housing company
 */
export async function getServiceCompanyUser(): Promise<ServiceCompanyUserResponse> {
  try {
    const fn = httpsCallable<unknown, ServiceCompanyUserResponse>(functions, 'getServiceCompanyUser');
    const result = await fn({});
    return result.data;
  } catch (error: any) {
    console.error('Error getting service company user:', error);
    throw new AppError(error.message || 'housingCompany.serviceCompany.getError', 'partners/get-service-company-error');
  }
}

/**
 * Remove management user from housing company
 */
export async function removeManagementUser(): Promise<void> {
  try {
    const fn = httpsCallable(functions, 'removeManagementUser');
    await fn({});
  } catch (error: any) {
    console.error('Error removing management user:', error);
    throw new AppError(error.message || 'housingCompany.management.removeError', 'partners/remove-management-error');
  }
}

/**
 * Remove service company user from housing company
 */
export async function removeServiceCompanyUser(): Promise<void> {
  try {
    const fn = httpsCallable(functions, 'removeServiceCompanyUser');
    await fn({});
  } catch (error: any) {
    console.error('Error removing service company user:', error);
    throw new AppError(error.message || 'housingCompany.serviceCompany.removeError', 'partners/remove-service-company-error');
  }
}
