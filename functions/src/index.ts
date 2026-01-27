import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Storage bucket reference
const bucket = admin.storage().bucket();

// Export partner management functions
export {
  getManagementUser,
  getServiceCompanyUser,
  removeManagementUser,
  removeServiceCompanyUser,
} from "./partnerManagement";

const db = admin.firestore();

type UserRole =
  | "resident"
  | "admin"
  | "maintenance"
  | "property_manager"
  | "housing_company"
  | "service_company";

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
 * Uploads an image to Firebase Storage for a fault report.
 * Handles base64 encoded images from React Native clients.
 *
 * @param {string} faultReportId - Fault report document ID
 * @param {string} imageBase64 - Base64 encoded image data (without data: prefix)
 * @param {string} contentType - MIME type of the image (e.g., 'image/webp')
 * @param {number} imageIndex - Index of the image (for naming)
 * @returns {string} url - Public download URL of the uploaded image
 */
export const uploadFaultReportImage = onCall(
  {region: "europe-west1", maxInstances: 10},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId} = await getUserProfile(uid);

    const {faultReportId, imageBase64, contentType, imageIndex} =
      request.data || {};

    if (
      typeof faultReportId !== "string" ||
      typeof imageBase64 !== "string" ||
      typeof contentType !== "string" ||
      typeof imageIndex !== "number"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // Verify the fault report exists and belongs to user's housing company
    const reportRef = db.collection("faultReports").doc(faultReportId);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      throw new HttpsError("not-found", "Fault report not found.");
    }

    const reportData = reportSnap.data();
    if (reportData?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    // Verify the user created this report (residents can only upload to own)
    if (reportData?.createdBy !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You can only upload images to your own fault reports."
      );
    }

    // Determine file extension
    let extension = ".jpg";
    if (contentType === "image/png") extension = ".png";
    else if (contentType === "image/webp") extension = ".webp";
    else if (contentType === "image/heic") extension = ".heic";

    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    const filePath = `faultReports/${faultReportId}/image_${imageIndex}_${uniqueSuffix}${extension}`;

    try {
      // Decode base64 and upload to Storage
      const imageBuffer = Buffer.from(imageBase64, "base64");

      const file = bucket.file(filePath);
      await file.save(imageBuffer, {
        metadata: {
          contentType,
        },
      });

      // Make the file publicly readable
      await file.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      return {url: publicUrl};
    } catch (error: unknown) {
      console.error("Upload error:", error);
      throw new HttpsError("internal", "Failed to upload image.");
    }
  }
);

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
    assertAllowedRole(role, [
      "admin",
      "maintenance",
      "service_company",
      "property_manager",
      "housing_company",
    ]);

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
    const knownStatuses = new Set([
      "created",
      "open",
      "waiting",
      "in_progress",
      "completed",
      "incomplete",
      "not_possible",
      "cancelled",
      "resolved",
      "closed",
    ]);
    const rawStatus = report?.status;
    const currentStatus =
      typeof rawStatus === "string" && knownStatuses.has(rawStatus) ?
        rawStatus :
        "open";
    console.log("[STATUS_DEBUG]", {
      uid,
      role,
      housingCompanyId,
      currentStatus,
      nextStatus: status,
    });
    if (report?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid,
      resolvedAt:
        status === "resolved" || status === "closed" ?
          admin.firestore.FieldValue.serverTimestamp() :
          report?.resolvedAt ?? null,
    };
    if (typeof comment === "string") {
      updates.comment = comment;
    }

    try {
      await docRef.update(updates);
    } catch (error: unknown) {
      throw new HttpsError("internal", "Failed to update fault report status.");
    }

    return {ok: true};
  }
);

/**
 * Updates a fault report description and images.
 * Residents can update only their own reports while status is open.
 *
 * @param {string} faultReportId - Fault report document ID
 * @param {string} description - Updated description
 * @param {string[]} imageUrls - Updated image URLs list
 * @returns {boolean} ok - Success indicator
 */
export const updateFaultReportDetails = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId} = await getUserProfile(uid);

    const {faultReportId, description, imageUrls} = request.data || {};

    if (typeof faultReportId !== "string") {
      throw new HttpsError("invalid-argument", "Missing fault report ID.");
    }

    if (
      typeof description !== "string" &&
      (!Array.isArray(imageUrls) || imageUrls.length === 0)
    ) {
      throw new HttpsError("invalid-argument", "No updates provided.");
    }

    if (typeof description === "string" && description.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Description is required.");
    }

    if (Array.isArray(imageUrls) && !imageUrls.every((url) => typeof url === "string")) {
      throw new HttpsError("invalid-argument", "Invalid image URLs.");
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

    if (report?.createdBy !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You can only update your own fault reports."
      );
    }

    if (report?.status !== "open") {
      throw new HttpsError(
        "failed-precondition",
        "Only open fault reports can be updated."
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (typeof description === "string") {
      updates.description = description.trim();
    }

    if (Array.isArray(imageUrls)) {
      updates.imageUrls = imageUrls;
    }

    await docRef.update(updates);

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
    assertAllowedRole(role, ["admin", "housing_company", "property_manager", "maintenance"]);

    const {title, content, type, startDate, startTime, endDate, endTime, audienceBuildingId, isPinned, imageUrls} = request.data || {};
    
    console.log("publishAnnouncement received:", {
      title: typeof title,
      content: typeof content,
      startDate: typeof startDate,
      startDateValue: startDate,
      endDate: typeof endDate,
      endDateValue: endDate,
      startTime: typeof startTime,
      endTime: typeof endTime,
    });
    
    if (typeof title !== "string" || typeof content !== "string") {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (!startDate || !endDate) {
      throw new HttpsError("invalid-argument", "startDate and endDate are required.");
    }

    const docRef = db.collection("announcements").doc();
    await docRef.set({
      housingCompanyId,
      title,
      content,
      type: typeof type === "string" ? type : "general",
      startDate: new Date(startDate),
      startTime: typeof startTime === "string" ? startTime : null,
      endDate: new Date(endDate),
      endTime: typeof endTime === "string" ? endTime : null,
      audienceBuildingId:
        typeof audienceBuildingId === "string" ? audienceBuildingId : null,
      isPinned: typeof isPinned === "boolean" ? isPinned : false,
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
      authorId: uid,
      authorName: "", // Will be populated by client profile
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
    assertAllowedRole(role, ["admin", "housing_company", "property_manager", "maintenance"]);

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

// ========== MANAGEMENT INVITES ==========

/**
 * Generates an invite code for property management.
 * Only accessible by housing_company role.
 * Only one active management invite can exist per housing company.
 *
 * @returns {string} inviteCode - 8-character invite code
 * @returns {string} expiresAt - ISO string of expiration date
 */
export const generateManagementInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {role, housingCompanyId} = await getUserProfile(uid);

    // Only housing_company can generate management invite codes
    if (role !== "housing_company") {
      throw new HttpsError(
        "permission-denied",
        "Only housing companies can generate management invite codes."
      );
    }

    // Check if there's already an active (unused and non-expired) invite
    const existingInvitesSnap = await db
      .collection("managementInvites")
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

    // Create management invite document
    const inviteRef = db.collection("managementInvites").doc();
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
 * Validates a management invite code and returns housing company details.
 * This is called BEFORE registration to show pre-filled form.
 * Does NOT require authentication.
 *
 * @param {string} inviteCode - 8-character invite code
 * @returns Housing company details (housingCompanyId, housingCompanyName)
 */
export const validateManagementInviteCode = onCall(
  {region: "europe-west1"},
  async (request) => {
    const {inviteCode} = request.data || {};

    if (typeof inviteCode !== "string" || inviteCode.length < 6) {
      throw new HttpsError("invalid-argument", "Invalid invite code format.");
    }

    // Find management invite by code
    const inviteSnap = await db
      .collection("managementInvites")
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
 * Joins with a management invite code.
 * Creates Firebase Auth user and user profile with maintenance role.
 * Does NOT require authentication (user is created during this call).
 *
 * @param {string} inviteCode - 8-character invite code
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @param {string} email - User email
 * @param {string} password - User password for authentication
 * @param {string} phone - Optional phone number
 * @param {string} companyName - Management company name
 * @returns {boolean} ok - Success indicator
 * @returns {string} housingCompanyId - Housing company ID
 */
export const joinWithManagementInviteCode = onCall(
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

    // Find management invite by code
    const inviteSnap = await db
      .collection("managementInvites")
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

    // Check if there's already a maintenance user for this housing company
    const existingMaintenanceSnap = await db
      .collection("users")
      .where("housingCompanyId", "==", invite.housingCompanyId)
      .where("role", "==", "maintenance")
      .limit(1)
      .get();

    if (!existingMaintenanceSnap.empty) {
      throw new HttpsError(
        "already-exists",
        "A maintenance user already exists for this housing company."
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
        role: "maintenance",
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

// Verification checklist:
// [ ] LF line endings
// [ ] No ESLint errors
// [ ] updateFaultReportStatus allows admin + maintenance
// [ ] Status values align with frontend
// [ ] No breaking API changes
