import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  db,
  assertAuth,
  getUserProfile,
  assertAllowedRole,
} from "./utils";

// ========== USER PROFILE ==========
// Note: Read and update operations are now handled by client + Security Rules
// Only privileged operations remain as Functions

/**
 * Deletes the authenticated resident account.
 * Removes user profile, auth account, and related fault reports.
 * Only accessible by resident role.
 *
 * @returns {boolean} ok - Success indicator
 */
export const deleteResidentAccount = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role} = await getUserProfile(uid);
    assertAllowedRole(role, ["resident"]);

    // Delete all fault reports created by this resident
    const faultReportsSnap = await db
      .collection("faultReports")
      .where("createdBy", "==", uid)
      .get();

    const deleteFaultReports = faultReportsSnap.docs.map((doc) => doc.ref.delete());
    await Promise.all(deleteFaultReports);

    // Delete user profile document
    await db.collection("users").doc(uid).delete();

    // Delete user from Firebase Authentication
    try {
      await admin.auth().deleteUser(uid);
    } catch (authError: unknown) {
      const errorCode = (authError as {code?: string}).code;
      if (errorCode !== "auth/user-not-found") {
        throw authError;
      }
    }

    return {ok: true};
  }
);
