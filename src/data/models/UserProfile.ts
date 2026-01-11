import { UserRole } from './enums';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  buildingId: string;
  apartmentNumber?: string;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProfileInput {
  id: string; // Firebase Auth UID
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  buildingId: string;
  apartmentNumber?: string;
}

export interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  apartmentNumber?: string;
  photoUrl?: string;
}
