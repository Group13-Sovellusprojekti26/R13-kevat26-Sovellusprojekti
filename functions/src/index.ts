import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

// Initialize SendGrid with API key from environment
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

type UserRole = "resident" | "admin" | "maintenance" | "property_manager" | "housing_company";

type UserProfile = {
  housingCompanyId: string;
  role: UserRole;
};

/**
 * Asserts that the request is authenticated and returns the user ID.
 * @param {CallableRequest} request - The callable request object
 * @return {string} The authenticated user ID
 * @throws {HttpsError} If user is not authenticated
 */
const assertAuth = (request: CallableRequest): string => {
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
const getUserProfile = async (uid: string): Promise<UserProfile> => {
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
 * Asserts that user has one of the allowed roles.
 * @param {UserRole} role - The user's role
 * @param {UserRole[]} allowed - Array of allowed roles
 * @throws {HttpsError} If user role is not in allowed list
 */
const assertAllowedRole = (role: UserRole, allowed: UserRole[]) => {
  if (!allowed.includes(role)) {
    throw new HttpsError("permission-denied", "Insufficient role.");
  }
};

// ========== FAULT REPORTS ==========
// Note: Read and create operations are now handled by client + Security Rules
// Only privileged operations remain as Functions

/**
 * Updates the status of a fault report.
 * Only accessible by admin and maintenance roles.
 * Validates that the report belongs to the user's housing company.
 *
 * @param {string} faultReportId - Fault report document ID
 * @param {string} status - New status value
 * @param {string} comment - Optional comment about the status change
 * @returns {boolean} ok - Success indicator
 */
export const updateFaultReportStatus = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);
    assertAllowedRole(role, ["admin", "maintenance"]);

    const {faultReportId, status, comment} = request.data || {};
    if (
      typeof faultReportId !== "string" ||
      typeof status !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const docRef = db.collection("faultReports").doc(faultReportId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Fault report not found.");
    }
    const report = snap.data();
    if (report?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    await docRef.update({
      status,
      comment: typeof comment === "string" ? comment : undefined,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid,
      resolvedAt:
        status === "resolved" || status === "closed" ?
          admin.firestore.FieldValue.serverTimestamp() :
          report?.resolvedAt ?? null,
    });

    return {ok: true};
  }
);

// ========== ANNOUNCEMENTS ==========
// Note: Read operations are now handled by client + Security Rules
// Only privileged operations remain as Functions

/**
 * Publishes a new announcement.
 * Only accessible by admin role.
 * Automatically assigns to user's housing company.
 *
 * @param {string} title - Announcement title
 * @param {string} content - Announcement content
 * @param {string} audienceBuildingId - Optional building ID for targeting
 * @returns {string} id - Created announcement ID
 */
export const publishAnnouncement = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);
    assertAllowedRole(role, ["admin"]);

    const {title, content, audienceBuildingId} = request.data || {};
    if (typeof title !== "string" || typeof content !== "string") {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const docRef = db.collection("announcements").doc();
    await docRef.set({
      housingCompanyId,
      title,
      content,
      audienceBuildingId:
        typeof audienceBuildingId === "string" ? audienceBuildingId : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
    });

    return {id: docRef.id};
  }
);

/**
 * Deletes an announcement by ID.
 * Only accessible by admin role.
 * Validates that announcement belongs to user's housing company.
 *
 * @param {string} announcementId - Announcement document ID
 * @returns {boolean} ok - Success indicator
 */
export const deleteAnnouncement = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);
    assertAllowedRole(role, ["admin"]);

    const {announcementId} = request.data || {};
    if (typeof announcementId !== "string") {
      throw new HttpsError("invalid-argument", "announcementId required.");
    }

    const docRef = db.collection("announcements").doc(announcementId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Announcement not found.");
    }
    if (snap.data()?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    await docRef.delete();
    return {ok: true};
  }
);

// ========== USER PROFILE ==========
// Note: Read and update operations are now handled by client + Security Rules
// Only initial profile creation remains as Function

/**
 * Creates a new user profile for the authenticated user.
 * Throws error if profile already exists.
 * Automatically assigns "resident" role.
 *
 * @param {string} email - User email address
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @param {string} phone - Optional phone number
 * @param {string} buildingId - Optional building ID
 * @param {string} apartmentNumber - Optional apartment number
 * @returns {boolean} ok - Success indicator
 */
export const createUserProfileFn = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);

    const {email, firstName, lastName, phone, buildingId, apartmentNumber} =
      request.data || {};
    if (
      typeof email !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const existingSnap = await db.collection("users").doc(uid).get();
    if (existingSnap.exists) {
      throw new HttpsError("already-exists", "User profile already exists.");
    }

    await db
      .collection("users")
      .doc(uid)
      .set({
        email,
        firstName,
        lastName,
        phone: typeof phone === "string" ? phone : null,
        buildingId: typeof buildingId === "string" ? buildingId : null,
        apartmentNumber:
          typeof apartmentNumber === "string" ? apartmentNumber : null,
        role: "resident",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {ok: true};
  }
);

// ========== HOUSING COMPANIES ==========
// Admin can create housing companies and generate invite codes

/**
 * Creates a new housing company (shell only).
 * Only accessible by admin role.
 *
 * @param {string} name - Company name
 * @param {string} address - Company address
 * @param {string} city - City
 * @param {string} postalCode - Postal code
 * @returns {string} id - Created housing company ID
 */
export const createHousingCompany = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role} = await getUserProfile(uid);
    
    // Only admins can create housing companies
    if (role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can create housing companies."
      );
    }

    const {name, address, city, postalCode} = request.data || {};
    if (
      typeof name !== "string" ||
      typeof address !== "string" ||
      typeof city !== "string" ||
      typeof postalCode !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Create housing company document (without user account yet)
    const companyRef = db.collection("housingCompanies").doc();
    await companyRef.set({
      name,
      address,
      city,
      postalCode,
      createdByAdminId: uid,
      isActive: true,
      isRegistered: false, // Not yet registered by housing company
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {id: companyRef.id};
  }
);

/**
 * Generates an invite code for a housing company.
 * Only accessible by admin role.
 * Invite code expires in 7 days.
 *
 * @param {string} housingCompanyId - Housing company ID
 * @returns {string} inviteCode - Generated 8-character invite code
 * @returns {string} expiresAt - ISO timestamp of expiration
 */
export const generateInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role} = await getUserProfile(uid);
    
    // Only admins can generate invite codes
    if (role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can generate invite codes."
      );
    }

    const {housingCompanyId} = request.data || {};
    if (typeof housingCompanyId !== "string") {
      throw new HttpsError("invalid-argument", "housingCompanyId required.");
    }

    const docRef = db.collection("housingCompanies").doc(housingCompanyId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Housing company not found.");
    }

    // Verify admin created this company
    const company = snap.data();
    if (company?.createdByAdminId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Can only generate codes for companies you created."
      );
    }

    // Generate random 8-character code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await docRef.update({
      inviteCode,
      inviteCodeExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      inviteCode,
      expiresAt: expiresAt.toISOString(),
    };
  }
);

/**
 * Deletes a housing company.
 * Only accessible by admin role.
 * Admin can only delete companies they created.
 *
 * @param {string} housingCompanyId - Housing company ID
 * @returns {boolean} ok - Success indicator
 */
export const deleteHousingCompany = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role} = await getUserProfile(uid);
    
    // Only admins can delete housing companies
    if (role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can delete housing companies."
      );
    }

    const {housingCompanyId} = request.data || {};
    if (typeof housingCompanyId !== "string") {
      throw new HttpsError("invalid-argument", "housingCompanyId required.");
    }

    const docRef = db.collection("housingCompanies").doc(housingCompanyId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Housing company not found.");
    }

    // Verify admin created this company
    const company = snap.data();
    if (company?.createdByAdminId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Can only delete companies you created."
      );
    }

    // Delete all residents (invite codes) for this housing company
    const residentInvitesSnap = await db
      .collection("residentInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .get();

    // For each resident invite that has been used, delete the resident's account
    const residentDeletePromises = residentInvitesSnap.docs.map(async (inviteDoc) => {
      const invite = inviteDoc.data();
      
      if (invite.isUsed && invite.usedByUserId) {
        const userId = invite.usedByUserId;
        
        try {
          // Delete user from Firebase Authentication
          await admin.auth().deleteUser(userId);
        } catch (authError: any) {
          // If user doesn't exist in Auth, continue
          if (authError.code !== "auth/user-not-found") {
            console.error(`Failed to delete user ${userId}:`, authError);
          }
        }

        // Delete user profile document
        await db.collection("users").doc(userId).delete();
        
        // Delete all fault reports created by this resident
        const faultReportsSnap = await db
          .collection("faultReports")
          .where("createdBy", "==", userId)
          .get();
        
        const faultReportDeletePromises = faultReportsSnap.docs.map((doc) =>
          doc.ref.delete()
        );
        await Promise.all(faultReportDeletePromises);
      }
      
      // Delete the resident invite document
      await inviteDoc.ref.delete();
    });

    await Promise.all(residentDeletePromises);

    // If company is registered and has a user account, delete it
    if (company?.isRegistered && company?.userId) {
      const userId = company.userId;
      
      try {
        // Delete user from Firebase Authentication
        await admin.auth().deleteUser(userId);
      } catch (authError: any) {
        // If user doesn't exist in Auth, continue (they might have been deleted manually)
        if (authError.code !== "auth/user-not-found") {
          throw authError;
        }
      }

      // Delete user profile document
      await db.collection("users").doc(userId).delete();
    }

    // Delete the housing company document
    await docRef.delete();

    return {ok: true};
  }
);

/**
 * Validates an invite code and returns housing company details.
 * This is called BEFORE registration to show pre-filled form.
 * Does NOT require authentication.
 *
 * @param {string} inviteCode - 8-character invite code
 * @returns Housing company details (name, address, city, postalCode)
 */
export const validateInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {inviteCode} = request.data || {};
    
    if (typeof inviteCode !== "string" || inviteCode.length < 6) {
      throw new HttpsError("invalid-argument", "Invalid invite code format.");
    }

    // Find housing company by invite code
    const companySnap = await db
      .collection("housingCompanies")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (companySnap.empty) {
      throw new HttpsError("not-found", "Invalid invite code.");
    }

    const companyDoc = companySnap.docs[0];
    const company = companyDoc.data();

    // Check if invite code is expired
    const expiresAt = company.inviteCodeExpiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Check if already registered
    if (company.isRegistered) {
      throw new HttpsError(
        "already-exists",
        "This housing company has already been registered."
      );
    }

    return {
      housingCompanyId: companyDoc.id,
      name: company.name,
      address: company.address,
      city: company.city,
      postalCode: company.postalCode,
    };
  }
);

/**
 * Registers a housing company with email and password.
 * Creates Firebase Auth account and user profile.
 * Does NOT require prior authentication.
 *
 * @param {string} inviteCode - 8-character invite code
 * @param {string} email - Email for login
 * @param {string} password - Password for login
 * @param {string} contactPerson - Contact person name
 * @param {string} phone - Optional phone number
 * @returns {boolean} ok - Success indicator
 */
export const registerWithInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {inviteCode, email, password, contactPerson, phone} =
      request.data || {};

    if (
      typeof inviteCode !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof contactPerson !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new HttpsError("invalid-argument", "Invalid email address.");
    }

    // Validate password
    if (password.length < 6) {
      throw new HttpsError(
        "invalid-argument",
        "Password must be at least 6 characters."
      );
    }

    // Find and validate housing company by invite code
    const companySnap = await db
      .collection("housingCompanies")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (companySnap.empty) {
      throw new HttpsError("not-found", "Invalid invite code.");
    }

    const companyDoc = companySnap.docs[0];
    const company = companyDoc.data();

    // Check if invite code is expired
    const expiresAt = company.inviteCodeExpiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Check if already registered
    if (company.isRegistered) {
      throw new HttpsError(
        "already-exists",
        "This housing company has already been registered."
      );
    }

    try {
      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        emailVerified: false,
      });

      // Create user profile
      await db
        .collection("users")
        .doc(userRecord.uid)
        .set({
          email,
          firstName: contactPerson,
          lastName: company.name,
          role: "housing_company",
          housingCompanyId: companyDoc.id,
          buildingId: "",
          phone: typeof phone === "string" ? phone : null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Update housing company as registered
      await companyDoc.ref.update({
        isRegistered: true,
        email,
        userId: userRecord.uid,
        contactPerson,
        phone: typeof phone === "string" ? phone : null,
        inviteCode: null, // Clear invite code after registration
        inviteCodeExpiresAt: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        userId: userRecord.uid,
        housingCompanyId: companyDoc.id,
      };
    } catch (error: any) {
      if (error.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "This email is already in use."
        );
      }
      throw new HttpsError(
        "internal",
        `Registration failed: ${error.message}`
      );
    }
  }
);

/**
 * Validates an invite code and creates a user profile with the role.
 * For residents and maintenance staff joining an existing housing company.
 * Accessible by authenticated users only.
 *
 * @param {string} inviteCode - 8-character invite code
 * @param {string} role - Role to assign (resident/maintenance)
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @param {string} email - User email
 * @param {string} buildingId - Building ID
 * @param {string} apartmentNumber - Optional apartment number
 * @param {string} phone - Optional phone number
 * @returns {boolean} ok - Success indicator
 * @returns {string} housingCompanyId - Housing company ID
 */
export const joinWithInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {
      inviteCode,
      role,
      firstName,
      lastName,
      email,
      buildingId,
      apartmentNumber,
      phone,
    } = request.data || {};

    if (
      typeof inviteCode !== "string" ||
      typeof role !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof buildingId !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Validate role (only resident and maintenance can join)
    const validRoles = ["maintenance", "resident"];
    if (!validRoles.includes(role)) {
      throw new HttpsError("invalid-argument", "Invalid role.");
    }

    // Check if user profile already exists
    const existingSnap = await db.collection("users").doc(uid).get();
    if (existingSnap.exists) {
      throw new HttpsError("already-exists", "User profile already exists.");
    }

    // Find housing company by invite code
    const companySnap = await db
      .collection("housingCompanies")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .get();

    if (companySnap.empty) {
      throw new HttpsError("not-found", "Invalid or expired invite code.");
    }

    const companyDoc = companySnap.docs[0];
    const company = companyDoc.data();

    // Check if invite code is expired
    const expiresAt = company.inviteCodeExpiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Create user profile
    await db
      .collection("users")
      .doc(uid)
      .set({
        email,
        firstName,
        lastName,
        phone: typeof phone === "string" ? phone : null,
        buildingId,
        apartmentNumber:
          typeof apartmentNumber === "string" ? apartmentNumber : null,
        role,
        housingCompanyId: companyDoc.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {ok: true, housingCompanyId: companyDoc.id};
  }
);

// ========== RESIDENT INVITE CODES ==========
// Housing company can create invite codes for residents

/**
 * Generates an invite code for a resident.
 * Only accessible by housing_company role.
 * Creates invite code with building and apartment info.
 *
 * @param {string} buildingId - Building identifier
 * @param {string} apartmentNumber - Apartment number
 * @returns {string} inviteCode - Generated 8-character invite code
 * @returns {string} expiresAt - ISO timestamp of expiration
 */
export const generateResidentInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role, housingCompanyId} = await getUserProfile(uid);
    
    // Only housing_company can generate resident invite codes
    if (role !== "housing_company") {
      throw new HttpsError(
        "permission-denied",
        "Only housing companies can generate resident invite codes."
      );
    }

    const {buildingId, apartmentNumber} = request.data || {};
    if (
      typeof buildingId !== "string" ||
      typeof apartmentNumber !== "string" ||
      !buildingId.trim() ||
      !apartmentNumber.trim()
    ) {
      throw new HttpsError(
        "invalid-argument",
        "buildingId and apartmentNumber are required."
      );
    }

    // Generate random 8-character code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create resident invite document
    const inviteRef = db.collection("residentInvites").doc();
    await inviteRef.set({
      inviteCode,
      housingCompanyId,
      buildingId: buildingId.trim(),
      apartmentNumber: apartmentNumber.trim(),
      createdByUserId: uid,
      isUsed: false,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      inviteCode,
      expiresAt: expiresAt.toISOString(),
      buildingId: buildingId.trim(),
      apartmentNumber: apartmentNumber.trim(),
    };
  }
);

/**
 * Validates a resident invite code and returns apartment details.
 * This is called BEFORE registration to show pre-filled form.
 * Does NOT require authentication.
 *
 * @param {string} inviteCode - 8-character invite code
 * @returns Apartment details (buildingId, apartmentNumber, housingCompanyId)
 */
export const validateResidentInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {inviteCode} = request.data || {};
    
    if (typeof inviteCode !== "string" || inviteCode.length < 6) {
      throw new HttpsError("invalid-argument", "Invalid invite code format.");
    }

    // Find resident invite by code
    const inviteSnap = await db
      .collection("residentInvites")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isUsed", "==", false)
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      throw new HttpsError("not-found", "Invalid invite code.");
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    // Check if invite code is expired
    const expiresAt = invite.expiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Get housing company name for display
    const companySnap = await db
      .collection("housingCompanies")
      .doc(invite.housingCompanyId)
      .get();
    
    const companyName = companySnap.exists 
      ? companySnap.data()?.name 
      : "Unknown";

    return {
      inviteId: inviteDoc.id,
      housingCompanyId: invite.housingCompanyId,
      housingCompanyName: companyName,
      buildingId: invite.buildingId,
      apartmentNumber: invite.apartmentNumber,
    };
  }
);

/**
 * Gets all resident invite codes for a housing company.
 * Only accessible by housing_company role.
 *
 * @returns Array of invite codes with their status
 */
export const getResidentInviteCodes = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role, housingCompanyId} = await getUserProfile(uid);
    
    if (role !== "housing_company") {
      throw new HttpsError(
        "permission-denied",
        "Only housing companies can view resident invite codes."
      );
    }

    const invitesSnap = await db
      .collection("residentInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const invites = invitesSnap.docs.map((doc) => {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate();
      const isExpired = expiresAt ? expiresAt < new Date() : true;
      
      return {
        id: doc.id,
        inviteCode: data.inviteCode,
        buildingId: data.buildingId,
        apartmentNumber: data.apartmentNumber,
        isUsed: data.isUsed,
        isExpired,
        expiresAt: expiresAt?.toISOString(),
        createdAt: data.createdAt?.toDate()?.toISOString(),
      };
    });

    return {invites};
  }
);

/**
 * Joins with a resident invite code.
 * Creates Firebase Auth user and user profile with pre-filled apartment info.
 * Does NOT require authentication (user is created during this call).
 *
 * @param {string} inviteCode - 8-character invite code
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name  
 * @param {string} email - User email
 * @param {string} password - User password for authentication
 * @param {string} phone - Optional phone number
 * @returns {boolean} ok - Success indicator
 * @returns {string} housingCompanyId - Housing company ID
 */
export const joinWithResidentInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {
      inviteCode,
      firstName,
      lastName,
      email,
      password,
      phone,
    } = request.data || {};

    if (
      typeof inviteCode !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Find resident invite by code
    const inviteSnap = await db
      .collection("residentInvites")
      .where("inviteCode", "==", inviteCode.toUpperCase())
      .where("isUsed", "==", false)
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      throw new HttpsError("not-found", "Invalid or expired invite code.");
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    // Check if invite code is expired
    const expiresAt = invite.expiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      throw new HttpsError("permission-denied", "Invite code has expired.");
    }

    // Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });
    } catch (authError: any) {
      if (authError.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "Email already in use.");
      }
      throw new HttpsError("internal", "Failed to create user account.");
    }

    const uid = userRecord.uid;

    // Create user profile
    await db
      .collection("users")
      .doc(uid)
      .set({
        email,
        firstName,
        lastName,
        phone: typeof phone === "string" ? phone : null,
        buildingId: invite.buildingId,
        apartmentNumber: invite.apartmentNumber,
        role: "resident",
        housingCompanyId: invite.housingCompanyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Mark invite as used
    await inviteDoc.ref.update({
      isUsed: true,
      usedByUserId: uid,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {ok: true, housingCompanyId: invite.housingCompanyId};
  }
);

/**
 * Deletes a resident invite and associated user.
 * Only accessible by housing_company role.
 * Deletes the invite code and the registered user if exists.
 *
 * @param {string} inviteId - Resident invite document ID
 * @returns {boolean} ok - Success indicator
 */
export const deleteResidentInvite = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role, housingCompanyId} = await getUserProfile(uid);
    
    if (role !== "housing_company") {
      throw new HttpsError(
        "permission-denied",
        "Only housing companies can delete resident invites."
      );
    }

    const {inviteId} = request.data || {};
    if (typeof inviteId !== "string") {
      throw new HttpsError("invalid-argument", "inviteId required.");
    }

    const docRef = db.collection("residentInvites").doc(inviteId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Resident invite not found.");
    }

    // Verify invite belongs to this housing company
    const invite = snap.data();
    if (invite?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Can only delete invites from your housing company."
      );
    }

    // If invite was used and has a registered user, delete the user
    if (invite?.isUsed && invite?.usedByUserId) {
      const userId = invite.usedByUserId;
      
      try {
        // Delete user from Firebase Authentication
        await admin.auth().deleteUser(userId);
      } catch (authError: any) {
        // If user doesn't exist in Auth, continue
        if (authError.code !== "auth/user-not-found") {
          throw authError;
        }
      }

      // Delete user profile document
      await db.collection("users").doc(userId).delete();
      
      // Delete all fault reports created by this user
      const faultReportsSnap = await db
        .collection("faultReports")
        .where("createdBy", "==", userId)
        .get();
      
      const faultReportDeletePromises = faultReportsSnap.docs.map((doc) =>
        doc.ref.delete()
      );
      await Promise.all(faultReportDeletePromises);
    }

    // Delete the resident invite document
    await docRef.delete();

    return {ok: true};
  }
);
