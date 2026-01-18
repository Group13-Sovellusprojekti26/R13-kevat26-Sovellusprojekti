/**
 * Housing Company model stored in Firestore: housingCompanies/{id}
 * Housing company under an Admin account
 */
export interface HousingCompany {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  
  // Admin who created this housing company
  createdByAdminId: string;
  
  // Is the housing company active
  isActive: boolean;
  
  // Is the housing company registered (used the invite code)
  isRegistered: boolean;
  
  // Filled after registration:
  email?: string;           // Housing company's login email
  userId?: string;          // Reference to users/{uid}
  contactPerson?: string;   // Contact person's name
  phone?: string;           // Phone number
  
  // Invite code for the housing company
  inviteCode?: string;
  inviteCodeExpiresAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Used when creating a housing company (admin)
 */
export interface CreateHousingCompanyInput {
  name: string;
  address: string;
  city: string;
  postalCode: string;
}

/**
 * Housing company data for a validated invite code
 */
export interface ValidatedInviteData {
  housingCompanyId: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
}

/**
 * Registration data using an invite code
 */
export interface RegisterWithInviteInput {
  inviteCode: string;
  email: string;
  password: string;
  contactPerson: string;
  phone?: string;
}

/**
 * Used for updating a housing company
 */
export interface UpdateHousingCompanyInput {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  isActive?: boolean;
}
