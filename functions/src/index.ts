import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

type UserRole = "resident" | "admin" | "maintenance";

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
 * Validates that profile contains housingCompanyId and role.
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
  if (!data?.housingCompanyId || !data?.role) {
    throw new HttpsError(
      "permission-denied",
      "User profile incomplete."
    );
  }
  return {
    housingCompanyId: data.housingCompanyId,
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
