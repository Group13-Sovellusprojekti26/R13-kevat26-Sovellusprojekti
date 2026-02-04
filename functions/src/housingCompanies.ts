import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  db,
  bucket,
  assertAuth,
  getUserProfile,
} from "./utils";

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
        } catch (authError: unknown) {
          // If user doesn't exist in Auth, continue
          const errorCode = (authError as {code?: string}).code;
          if (errorCode !== "auth/user-not-found") {
            console.error(`Failed to delete user ${userId}:`, authError);
          }
        }

        // Delete user profile document
        await db.collection("users").doc(userId).delete();

        // Note: Fault reports and their images will be deleted in bulk below
      }

      // Delete the resident invite document
      await inviteDoc.ref.delete();
    });

    await Promise.all(residentDeletePromises);

    // Delete all fault report images from Storage for this housing company
    const allFaultReportsSnap = await db
      .collection("faultReports")
      .where("housingCompanyId", "==", housingCompanyId)
      .get();

    // Delete all images for each fault report
    const faultReportImageDeletePromises = allFaultReportsSnap.docs.map(async (faultDoc) => {
      const faultReportId = faultDoc.id;

      try {
        // Delete all images in the faultReports/{faultReportId}/ folder
        const [files] = await bucket.getFiles({
          prefix: `faultReports/${faultReportId}/`,
        });

        // Delete each image file
        const imageDeletePromises = files.map((file) => file.delete().catch((error) => {
          console.error(`Failed to delete image ${file.name}:`, error);
        }));

        await Promise.all(imageDeletePromises);
      } catch (error) {
        console.error(`Failed to delete images for fault report ${faultReportId}:`, error);
      }

      // Delete the fault report document
      await faultDoc.ref.delete();
    });

    await Promise.all(faultReportImageDeletePromises);

    // Delete all management invites for this housing company
    const managementInvitesSnap = await db
      .collection("managementInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .get();

    // For each management invite that has been used, delete the maintenance user's account
    const managementDeletePromises = managementInvitesSnap.docs.map(async (inviteDoc) => {
      const invite = inviteDoc.data();

      if (invite.isUsed && invite.usedByUserId) {
        const userId = invite.usedByUserId;

        try {
          // Delete user from Firebase Authentication
          await admin.auth().deleteUser(userId);
        } catch (authError: unknown) {
          // If user doesn't exist in Auth, continue
          const errorCode = (authError as {code?: string}).code;
          if (errorCode !== "auth/user-not-found") {
            console.error(`Failed to delete maintenance user ${userId}:`, authError);
          }
        }

        // Delete user profile document
        await db.collection("users").doc(userId).delete();
      }

      // Delete the management invite document
      await inviteDoc.ref.delete();
    });

    await Promise.all(managementDeletePromises);

    // Delete all service company invites for this housing company
    const serviceCompanyInvitesSnap = await db
      .collection("serviceCompanyInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .get();

    // For each service company invite that has been used, delete the service company user's account
    const serviceCompanyDeletePromises = serviceCompanyInvitesSnap.docs.map(async (inviteDoc) => {
      const invite = inviteDoc.data();

      if (invite.isUsed && invite.usedByUserId) {
        const userId = invite.usedByUserId;

        try {
          // Delete user from Firebase Authentication
          await admin.auth().deleteUser(userId);
        } catch (authError: unknown) {
          // If user doesn't exist in Auth, continue
          const errorCode = (authError as {code?: string}).code;
          if (errorCode !== "auth/user-not-found") {
            console.error(`Failed to delete service company user ${userId}:`, authError);
          }
        }

        // Delete user profile document
        await db.collection("users").doc(userId).delete();
      }

      // Delete the service company invite document
      await inviteDoc.ref.delete();
    });

    await Promise.all(serviceCompanyDeletePromises);

    // If company is registered and has a user account, delete it
    if (company?.isRegistered && company?.userId) {
      const userId = company.userId;

      try {
        // Delete user from Firebase Authentication
        await admin.auth().deleteUser(userId);
      } catch (authError: unknown) {
        // If user doesn't exist in Auth, continue (they might have been deleted manually)
        const errorCode = (authError as {code?: string}).code;
        if (errorCode !== "auth/user-not-found") {
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
    } catch (error: unknown) {
      const errorInfo = error as {code?: string; message?: string};
      if (errorInfo.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "This email is already in use."
        );
      }
      throw new HttpsError(
        "internal",
        `Registration failed: ${errorInfo.message ?? "Unknown error"}`
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
