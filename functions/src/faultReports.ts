import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  db,
  bucket,
  assertAuth,
  getUserProfile,
  getUserNameFromProfile,
  assertAllowedRole,
} from "./utils";

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
    const userProfile = await getUserProfile(uid);
    const {housingCompanyId, role} = userProfile;

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

    // Permission check: residents can only upload to own reports
    // Admins and property managers can upload to any report in their housing company
    const isAdmin = role === "admin";
    const isHousingCompany = role === "housing_company";
    const isMaintenance = role === "maintenance" || role === "property_manager";
    const isOwnReport = reportData?.createdBy === uid;

    if (!isAdmin && !isHousingCompany && !isMaintenance && !isOwnReport) {
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
 * Adds a work log entry to a fault report.
 * Only accessible by service company role.
 * Work logs are visible to all parties but can only be created by service company.
 *
 * @param {string} faultReportId - Fault report document ID
 * @param {string} content - Work log content (e.g., "Leaking faucet repaired")
 * @returns {boolean} ok - Success indicator
 */
export const addWorkLog = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);

    // Only service company can add work logs
    assertAllowedRole(role, ["service_company"]);

    const {faultReportId, content} = request.data || {};
    if (
      typeof faultReportId !== "string" ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const docRef = db.collection("faultReports").doc(faultReportId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Fault report not found.");
    }
    const report = snap.data();

    // Check housing company match
    if (report?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    // Get user name for the work log
    const {firstName, lastName} = await getUserNameFromProfile(uid);
    const createdByName = `${firstName} ${lastName}`.trim() || "Huolto";

    // Create the work log entry
    const workLogEntry = {
      id: db.collection("_").doc().id, // Generate unique ID
      content: content.trim(),
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: uid,
      createdByName,
    };

    // Add to workLogs array (create if doesn't exist)
    try {
      // First check if workLogs field exists, if not initialize it
      const currentData = snap.data();
      if (!currentData?.workLogs) {
        await docRef.update({
          workLogs: [workLogEntry],
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await docRef.update({
          workLogs: admin.firestore.FieldValue.arrayUnion(workLogEntry),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error: unknown) {
      console.error("Add work log error:", error);
      throw new HttpsError("internal", "Failed to add work log.");
    }

    return {ok: true};
  }
);

/**
 * Deletes a work log entry from a fault report.
 * Only accessible by service company role.
 * Users can only delete their own work logs.
 *
 * @param {string} faultReportId - Fault report document ID
 * @param {string} workLogId - Work log entry ID to delete
 * @returns {boolean} ok - Success indicator
 */
export const deleteWorkLog = onCall(
  {region: "europe-west1"},
  async (request) => {
    const uid = assertAuth(request);
    const {housingCompanyId, role} = await getUserProfile(uid);

    // Only service company can delete work logs
    assertAllowedRole(role, ["service_company"]);

    const {faultReportId, workLogId} = request.data || {};
    if (
      typeof faultReportId !== "string" ||
      typeof workLogId !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const docRef = db.collection("faultReports").doc(faultReportId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Fault report not found.");
    }
    const report = snap.data();

    // Check housing company match
    if (report?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    // Find the work log to delete
    const workLogs = report?.workLogs || [];
    const workLogToDelete = workLogs.find(
      (log: {id: string; createdBy: string}) => log.id === workLogId
    );

    if (!workLogToDelete) {
      throw new HttpsError("not-found", "Work log not found.");
    }

    // Only allow deletion of own work logs
    if (workLogToDelete.createdBy !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You can only delete your own work logs."
      );
    }

    // Remove the work log from the array
    try {
      const updatedWorkLogs = workLogs.filter(
        (log: {id: string}) => log.id !== workLogId
      );
      await docRef.update({
        workLogs: updatedWorkLogs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error: unknown) {
      console.error("Delete work log error:", error);
      throw new HttpsError("internal", "Failed to delete work log.");
    }

    return {ok: true};
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
    
    // Check housing company match
    if (report?.housingCompanyId !== housingCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "Cross-company access blocked."
      );
    }

    // Residents can only cancel their own reports
    if (role === "resident") {
      if (report?.createdBy !== uid) {
        throw new HttpsError(
          "permission-denied",
          "Residents can only cancel their own reports."
        );
      }
      if (status !== "cancelled") {
        throw new HttpsError(
          "permission-denied",
          "Residents can only change status to cancelled."
        );
      }
    } else {
      // Non-residents must have proper roles
      assertAllowedRole(role, [
        "admin",
        "maintenance",
        "service_company",
        "property_manager",
        "housing_company",
      ]);
    }

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
