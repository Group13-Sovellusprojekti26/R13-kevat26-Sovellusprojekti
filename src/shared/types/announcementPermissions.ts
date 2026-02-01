import type { UserRole } from '@/data/models/enums';

/**
 * CENTRALIZED ROLE-BASED ANNOUNCEMENT PERMISSIONS CONFIGURATION
 * 
 * This is the single source of truth for all announcement permission logic.
 * Used by:
 * - UI layer (AnnouncementPermissions) for conditional rendering
 * - Cloud Functions for role-based access control
 * - All announcement-related permission checks
 * 
 * IMPORTANT: If new roles are introduced, update ANNOUNCEMENT_ROLES_CONFIG.
 * Cloud Functions must also be updated to use the new roles in:
 * - functions/src/index.ts - publishAnnouncement, updateAnnouncement, deleteAnnouncement, etc.
 * 
 * Keep the roles list in sync with: FULL_ACCESS_ANNOUNCEMENT_ROLES constant below
 */

/**
 * Role permission levels for announcements.
 * Determines what actions a user with a given role can perform on announcements.
 */
export interface AnnouncementRoleConfig {
  canView: boolean;
  canViewExpired: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Complete announcement role configuration.
 * Maps each role to its permission level.
 * 
 * Role hierarchy:
 * - ADMIN, HOUSING_COMPANY, PROPERTY_MANAGER, MAINTENANCE: Full access (CRUD)
 * - SERVICE_COMPANY, RESIDENT: Read-only access
 * 
 * Update this when:
 * - A new role is introduced to the system
 * - Permission levels for existing roles change
 * - IMPORTANT: Also update FULL_ACCESS_ANNOUNCEMENT_ROLES constant below
 */
export const ANNOUNCEMENT_ROLES_CONFIG: Record<string, AnnouncementRoleConfig> = {
  // Full access roles - can create, read, edit, delete announcements
  admin: {
    canView: true,
    canViewExpired: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  housing_company: {
    canView: true,
    canViewExpired: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  property_manager: {
    canView: true,
    canViewExpired: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  maintenance: {
    canView: true,
    canViewExpired: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },

  // Read-only access roles - can only view announcements
  resident: {
    canView: true,
    canViewExpired: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  service_company: {
    canView: true,
    canViewExpired: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
};

/**
 * Roles that have full announcement management capabilities (CRUD).
 * Used by Cloud Functions for efficient role validation.
 * 
 * IMPORTANT: Must match the roles with full permissions in ANNOUNCEMENT_ROLES_CONFIG.
 * Keep this in sync when updating ANNOUNCEMENT_ROLES_CONFIG.
 * 
 * Used in Cloud Functions:
 * - functions/src/index.ts: assertAllowedRole(role, FULL_ACCESS_ANNOUNCEMENT_ROLES)
 */
export const FULL_ACCESS_ANNOUNCEMENT_ROLES = [
  'admin',
  'housing_company',
  'property_manager',
  'maintenance',
];

/**
 * Gets the announcement permission config for a role.
 * Returns read-only default if role is not found.
 * 
 * @param {string} role - User role
 * @returns {AnnouncementRoleConfig} Permission configuration for the role
 * 
 * @example
 * const config = getRoleAnnouncementConfig('admin');
 * console.log(config.canDelete); // true
 */
export const getRoleAnnouncementConfig = (role: string): AnnouncementRoleConfig => {
  return ANNOUNCEMENT_ROLES_CONFIG[role] ?? {
    canView: false,
    canViewExpired: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  };
};

/**
 * Announcement permissions model defining role-based access controls.
 * Specifies which actions and UI elements are available to a user based on their role.
 * Used throughout announcement feature for conditional rendering and operation validation.
 * 
 * @interface AnnouncementPermissions
 * @property {boolean} canView - Whether user can view announcements
 * @property {boolean} canViewExpired - Whether user can view expired/archived announcements
 * @property {boolean} canCreate - Whether user can create new announcements
 * @property {boolean} canEdit - Whether user can modify existing announcements
 * @property {boolean} canDelete - Whether user can remove announcements
 * @property {boolean} showCreateButton - Whether create button appears in UI
 * @property {boolean} showExpiredToggle - Whether active/expired toggle appears in UI
 * @property {boolean} showEditDeleteActions - Whether edit/delete icons appear on announcement cards
 */
export interface AnnouncementPermissions {
  // Display permissions
  canView: boolean;
  canViewExpired: boolean;
  
  // Modification permissions
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  
  // UI display options
  showCreateButton: boolean;
  showExpiredToggle: boolean;
  showEditDeleteActions: boolean;
}

/**
 * Maps role config to UI permission object.
 * Determines which UI elements should be shown based on role permissions.
 * 
 * @param {boolean} canCreate - Whether role can create announcements
 * @param {boolean} canEdit - Whether role can edit announcements
 * @param {boolean} canDelete - Whether role can delete announcements
 * @returns {AnnouncementPermissions} Complete permission set for UI
 */
const mapRoleConfigToPermissions = (
  canView: boolean,
  canViewExpired: boolean,
  canCreate: boolean,
  canEdit: boolean,
  canDelete: boolean
): AnnouncementPermissions => ({
  canView,
  canViewExpired,
  canCreate,
  canEdit,
  canDelete,
  // Show create button if user has create permission
  showCreateButton: canCreate,
  // Show expired toggle if user can view announcements
  showExpiredToggle: canView,
  // Show edit/delete actions if user has either permission
  showEditDeleteActions: canEdit || canDelete,
});

/**
 * Determines announcement permissions for a given user role.
 * Accepts both UserRole enum values and string role names.
 * Uses centralized role configuration from ANNOUNCEMENT_ROLES_CONFIG.
 * Returns read-only permissions as default for unknown roles.
 * 
 * @function getAnnouncementPermissions
 * @param {UserRole | string} role - User role (UserRole enum or string value)
 * @returns {AnnouncementPermissions} Permission set appropriate for the role
 * 
 * @example
 * // Using enum
 * const perms1 = getAnnouncementPermissions(UserRole.HOUSING_COMPANY);
 * 
 * // Using string
 * const perms2 = getAnnouncementPermissions('housing_company');
 * 
 * // Both return identical full permissions
 */
export const getAnnouncementPermissions = (
  role: UserRole | string
): AnnouncementPermissions => {
  // Convert to string value - handles both enum and string inputs
  const roleStr = typeof role === 'string' ? role : String(role);
  
  // Get role config from centralized configuration
  const config = getRoleAnnouncementConfig(roleStr);
  
  return mapRoleConfigToPermissions(
    config.canView,
    config.canViewExpired,
    config.canCreate,
    config.canEdit,
    config.canDelete
  );
};
