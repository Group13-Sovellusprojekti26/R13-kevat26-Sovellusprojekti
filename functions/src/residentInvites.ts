import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  db,
  assertAuth,
  getUserProfile,
} from "./utils";

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

    const companyName = companySnap.exists ? companySnap.data()?.name : "Unknown";

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

    const invites = await Promise.all(invitesSnap.docs.map(async (doc) => {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate();
      const isExpired = expiresAt ? expiresAt < new Date() : true;
      let residentName: string | undefined;

      if (data.isUsed && data.usedByUserId) {
        const userSnap = await db.collection("users").doc(data.usedByUserId).get();
        if (userSnap.exists) {
          const user = userSnap.data();
          const nameParts = [user?.firstName, user?.lastName].filter(Boolean);
          if (nameParts.length > 0) {
            residentName = nameParts.join(" ");
          }
        }
      }

      return {
        id: doc.id,
        inviteCode: data.inviteCode,
        buildingId: data.buildingId,
        apartmentNumber: data.apartmentNumber,
        isUsed: data.isUsed,
        isExpired,
        expiresAt: expiresAt?.toISOString(),
        createdAt: data.createdAt?.toDate()?.toISOString(),
        residentName,
      };
    }));

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
    } catch (authError: unknown) {
      const errorCode = (authError as {code?: string}).code;
      if (errorCode === "auth/email-already-exists") {
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
      } catch (authError: unknown) {
        // If user doesn't exist in Auth, continue
        const errorCode = (authError as {code?: string}).code;
        if (errorCode !== "auth/user-not-found") {
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
