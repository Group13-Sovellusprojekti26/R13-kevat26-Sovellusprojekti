import { UserRole } from './enums';

/**
 * User profile stored in Firestore: users/{uid}
 * Tämä on AINA se lähde josta buildingId ja housingCompanyId tulevat
 */
export interface UserProfile {
  id: string;                // Firebase Auth UID
  email: string;

  firstName: string;
  lastName: string;
  role: UserRole;

  // 🔑 KRIITTINEN – tarvitaan kaikissa kyselyissä
  housingCompanyId: string;
  buildingId: string;

  apartmentNumber?: string;
  phone?: string;
  photoUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Käytetään kun käyttäjä luodaan ensimmäistä kertaa
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
 * Käytetään profiilin muokkaukseen
 */
export interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  apartmentNumber?: string;
  photoUrl?: string;
}
