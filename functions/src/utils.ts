import {HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Get Firestore reference
export const db = admin.firestore();

// Get Storage bucket reference
export const bucket = admin.storage().bucket();

// User role types
export type UserRole =
  | "resident"
  | "admin"
  | "maintenance"
  | "property_manager"
  | "housing_company"
  | "service_company";

export type UserProfile = {
  housingCompanyId: string;
  role: UserRole;
};

/**
 * ANNOUNCEMENT PERMISSIONS CONFIGURATION FOR CLOUD FUNCTIONS
 * 
 * IMPORTANT: This list must match FULL_ACCESS_ANNOUNCEMENT_ROLES in:
 * src/shared/types/announcementPermissions.ts
 * 
 * If you add/remove roles, update BOTH locations:
 * 1. src/shared/types/announcementPermissions.ts - Update ANNOUNCEMENT_ROLES_CONFIG and FULL_ACCESS_ANNOUNCEMENT_ROLES
 * 2. This list below - Keep it in sync
 * 
 * Roles that have full announcement management capabilities (CRUD):
 * - admin
 * - housing_company
 * - property_manager
 * - maintenance
 */
export const FULL_ACCESS_ANNOUNCEMENT_ROLES = [
  'admin',
  'housing_company',
  'property_manager',
  'maintenance',
];

/**
 * Asserts that the request is authenticated and returns the user ID.
 * @param {CallableRequest} request - The callable request object
 * @return {string} The authenticated user ID
 * @throws {HttpsError} If user is not authenticated
 */
export const assertAuth = (request: CallableRequest): string => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  return uid;
};

/**
 * Fetches user profile from Firestore.
 * Validates that profile contains role (housingCompanyId for non-admin users).
 * Admin users don't need housingCompanyId.
 * @param {string} uid - The user ID
 * @return {Promise<UserProfile>} The user profile
 * @throws {HttpsError} If profile not found or incomplete
 */
export const getUserProfile = async (uid: string): Promise<UserProfile> => {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "User profile not found.");
  }
  const data = snap.data() as Partial<UserProfile>;
  if (!data?.role) {
    throw new HttpsError(
      "permission-denied",
      "User profile incomplete: missing role."
    );
  }

  // Admin doesn't need housingCompanyId
  if (data.role !== "admin" && !data?.housingCompanyId) {
    throw new HttpsError(
      "permission-denied",
      "User profile incomplete: missing housingCompanyId."
    );
  }

  return {
    housingCompanyId: data.housingCompanyId || "",
    role: data.role,
  };
};

/**
 * Fetches user profile with name information from Firestore.
 * @param {string} uid - The user ID
 * @return {Promise<{firstName: string, lastName: string}>} User name
 * @throws {HttpsError} If profile not found or name fields missing
 */
export const getUserNameFromProfile = async (uid: string): Promise<{firstName: string, lastName: string}> => {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "User profile not found.");
  }
  const data = snap.data();
  const firstName = typeof data?.firstName === "string" ? data.firstName : "";
  const lastName = typeof data?.lastName === "string" ? data.lastName : "";

  return {firstName, lastName};
};

/**
 * Asserts that user has one of the allowed roles.
 * @param {UserRole} role - The user's role
 * @param {UserRole[]} allowed - Array of allowed roles
 * @throws {HttpsError} If user role is not in allowed list
 */
export const assertAllowedRole = (role: UserRole, allowed: UserRole[]) => {
  if (!allowed.includes(role)) {
    throw new HttpsError("permission-denied", "Insufficient role.");
  }
};
