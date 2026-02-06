/**
 * Firebase Cloud Functions - Main Entry Point
 * 
 * This file serves as the main entry point for all Cloud Functions.
 * Functions are organized into separate modules by feature/domain:
 * 
 * - faultReports.ts: Fault report management (upload images, status updates, work logs)
 * - announcements.ts: Announcement CRUD operations and attachments
 * - userProfile.ts: User profile management (delete account)
 * - housingCompanies.ts: Housing company management (create, delete, invite codes)
 * - residentInvites.ts: Resident invite code management
 * - managementInvites.ts: Property management invite code management
 * - serviceCompanyInvites.ts: Service company invite code management
 * - partnerManagement.ts: Partner user management (get/remove management/service users)
 * - utils.ts: Shared utilities (auth helpers, profile fetching, role validation)
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK (must be done before importing other modules)
admin.initializeApp();

// ========== FAULT REPORTS ==========
export {
  uploadFaultReportImage,
  addWorkLog,
  deleteWorkLog,
  updateFaultReportStatus,
  updateFaultReportDetails,
} from "./faultReports";

// ========== ANNOUNCEMENTS ==========
export {
  publishAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  uploadAnnouncementAttachment,
  updateAnnouncementWithAttachments,
  deleteAnnouncementAttachmentFile,
} from "./announcements";

// ========== USER PROFILE ==========
export {
  deleteResidentAccount,
} from "./userProfile";

// ========== HOUSING COMPANIES ==========
export {
  createHousingCompany,
  generateInviteCode,
  deleteHousingCompany,
  validateInviteCode,
  registerWithInviteCode,
  joinWithInviteCode,
} from "./housingCompanies";

// ========== RESIDENT INVITES ==========
export {
  generateResidentInviteCode,
  validateResidentInviteCode,
  getResidentInviteCodes,
  joinWithResidentInviteCode,
  deleteResidentInvite,
} from "./residentInvites";

// ========== MANAGEMENT INVITES ==========
export {
  generateManagementInviteCode,
  validateManagementInviteCode,
  joinWithManagementInviteCode,
} from "./managementInvites";

// ========== SERVICE COMPANY INVITES ==========
export {
  generateServiceCompanyInviteCode,
  validateServiceCompanyInviteCode,
  joinWithServiceCompanyInviteCode,
} from "./serviceCompanyInvites";

// ========== PARTNER MANAGEMENT ==========
export {
  getManagementUser,
  getServiceCompanyUser,
  removeManagementUser,
  removeServiceCompanyUser,
} from "./partnerManagement";
