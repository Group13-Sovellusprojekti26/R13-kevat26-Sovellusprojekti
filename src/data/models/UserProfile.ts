import { UserRole } from './enums';

/**
 * User profile stored in Firestore: users/{uid}
 * This is ALWAYS the source for buildingId and housingCompanyId
 */
export interface UserProfile {
  id: string;                // Firebase Auth UID
  email: string;

  firstName: string;
  lastName: string;
  role: UserRole;

  housingCompanyId: string;
  buildingId: string;

  apartmentNumber?: string;
  phone?: string;
  photoUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Used when a user is created for the first time
 */
export interface CreateUserProfileInput {
  id: string;                // Firebase Auth UID
  email: string;

  firstName: string;
  lastName: string;
  role: UserRole;

  housingCompanyId: string;
  buildingId: string;

  apartmentNumber?: string;
  phone?: string;
}

/**
 * Used for editing/updating the profile
 */
export interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  apartmentNumber?: string;
  photoUrl?: string;
}
