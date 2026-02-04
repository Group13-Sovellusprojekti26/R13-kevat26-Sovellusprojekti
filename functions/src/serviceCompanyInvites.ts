import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  db,
  assertAuth,
  getUserProfile,
} from "./utils";

// ========== SERVICE COMPANY INVITES ==========

/**
 * Generates an invite code for service company.
 * Only accessible by housing_company role.
 * Only one active service company invite can exist per housing company.
 *
 * @returns {string} inviteCode - 8-character invite code
 * @returns {string} expiresAt - ISO string of expiration date
 */
export const generateServiceCompanyInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role, housingCompanyId} = await getUserProfile(uid);

    // Only housing_company can generate service company invite codes
    if (role !== "housing_company") {
      throw new HttpsError(
        "permission-denied",
        "Only housing companies can generate service company invite codes."
      );
    }

    // Check if there's already an active (unused and non-expired) invite
    const existingInvitesSnap = await db
      .collection("serviceCompanyInvites")
      .where("housingCompanyId", "==", housingCompanyId)
      .where("isUsed", "==", false)
      .get();

    // Check if any of the existing invites are not expired
    const now = new Date();
    const activeInvites = existingInvitesSnap.docs.filter((doc) => {
      const expiresAt = doc.data().expiresAt?.toDate();
      return expiresAt && expiresAt > now;
    });

    if (activeInvites.length > 0) {
      // Return the existing active invite instead of creating a new one
      const existingInvite = activeInvites[0].data();
      return {
        inviteCode: existingInvite.inviteCode,
        expiresAt: existingInvite.expiresAt?.toDate()?.toISOString(),
      };
    }

    // Generate random 8-character code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create service company invite document
    const inviteRef = db.collection("serviceCompanyInvites").doc();
    await inviteRef.set({
      inviteCode,
      housingCompanyId,
      createdByUserId: uid,
      isUsed: false,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      inviteCode,
      expiresAt: expiresAt.toISOString(),
    };
  }
);

/**
 * Validates a service company invite code and returns housing company details.
 * This is called BEFORE registration to show pre-filled form.
 * Does NOT require authentication.
 *
 * @param {string} inviteCode - 8-character invite code
 * @returns Housing company details (housingCompanyId, housingCompanyName)
 */
export const validateServiceCompanyInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {inviteCode} = request.data || {};

    if (typeof inviteCode !== "string" || inviteCode.length < 6) {
      throw new HttpsError("invalid-argument", "Invalid invite code format.");
    }

    // Find service company invite by code
    const inviteSnap = await db
      .collection("serviceCompanyInvites")
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
    };
  }
);

/**
 * Joins with a service company invite code.
 * Creates Firebase Auth user and user profile with service_company role.
 * Does NOT require authentication (user is created during this call).
 *
 * @param {string} inviteCode - 8-character invite code
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @param {string} email - User email
 * @param {string} password - User password for authentication
 * @param {string} phone - Optional phone number
 * @param {string} companyName - Service company name
 * @returns {boolean} ok - Success indicator
 * @returns {string} housingCompanyId - Housing company ID
 */
export const joinWithServiceCompanyInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {
      inviteCode,
      firstName,
      lastName,
      email,
      password,
      phone,
      companyName,
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

    // Find service company invite by code
    const inviteSnap = await db
      .collection("serviceCompanyInvites")
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

    // Check if there's already a service company user for this housing company
    const existingServiceCompanySnap = await db
      .collection("users")
      .where("housingCompanyId", "==", invite.housingCompanyId)
      .where("role", "==", "service_company")
      .limit(1)
      .get();

    if (!existingServiceCompanySnap.empty) {
      throw new HttpsError(
        "already-exists",
        "A service company user already exists for this housing company."
      );
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    // Create user profile document
    await db
      .collection("users")
      .doc(userRecord.uid)
      .set({
        email,
        firstName,
        lastName,
        phone: typeof phone === "string" ? phone : null,
        companyName: typeof companyName === "string" ? companyName : null,
        role: "service_company",
        housingCompanyId: invite.housingCompanyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Mark invite as used
    await inviteDoc.ref.update({
      isUsed: true,
      usedByUserId: userRecord.uid,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {ok: true, housingCompanyId: invite.housingCompanyId};
  }
);
