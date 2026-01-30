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
 * Creates a read-only permission set for roles that can view but not modify announcements.
 * Applied to RESIDENT and SERVICE_COMPANY roles.
 * Allows viewing expired announcements and toggling between active/expired views.
 * No create, edit, or delete capabilities.
 * 
 * @function createReadOnlyPermissions
 * @returns {AnnouncementPermissions} Permission object with read-only capabilities
 * 
 * @example
 * const permissions = createReadOnlyPermissions();
 * console.log(permissions.canCreate); // false
 * console.log(permissions.showExpiredToggle); // true
 */
const createReadOnlyPermissions = (): AnnouncementPermissions => ({
  canView: true,
  canViewExpired: true,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  showCreateButton: false,
  showExpiredToggle: true,
  showEditDeleteActions: false,
});

/**
 * Creates a full permission set for roles with complete announcement management capabilities.
 * Applied to ADMIN, MAINTENANCE, PROPERTY_MANAGER, and HOUSING_COMPANY roles.
 * Allows viewing, creating, editing, deleting announcements and viewing expired announcements.
 * Shows all UI elements including create button and edit/delete actions on cards.
 * 
 * @function createFullPermissions
 * @returns {AnnouncementPermissions} Permission object with full CRUD capabilities
 * 
 * @example
 * const permissions = createFullPermissions();
 * console.log(permissions.canEdit); // true
 * console.log(permissions.showCreateButton); // true
 */
const createFullPermissions = (): AnnouncementPermissions => ({
  canView: true,
  canViewExpired: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  showCreateButton: true,
  showExpiredToggle: true,
  showEditDeleteActions: true,
});

/**
 * Determines announcement permissions for a given user role.
 * Accepts both UserRole enum values and string role names.
 * Uses .valueOf() to extract string value from enum for consistent comparison.
 * Returns read-only permissions as default for unknown roles.
 * 
 * Role mappings:
 * - RESIDENT ('resident'): Read-only with expired toggle
 * - SERVICE_COMPANY ('service_company'): Read-only with expired toggle
 * - MAINTENANCE ('maintenance'): Full CRUD
 * - PROPERTY_MANAGER ('property_manager'): Full CRUD
 * - HOUSING_COMPANY ('housing_company'): Full CRUD
 * - ADMIN ('admin'): Full CRUD
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
  role: UserRole | 'resident' | 'admin' | 'maintenance' | 'property_manager' | 'housing_company' | 'service_company'
): AnnouncementPermissions => {
  // Convert to string value - handles both enum and string inputs
  const roleStr = typeof role === 'string' ? role : role.valueOf();
  
  switch (roleStr) {
    case 'resident':
    case 'service_company':
      return createReadOnlyPermissions();
    case 'maintenance':
    case 'property_manager':
    case 'housing_company':
    case 'admin':
      return createFullPermissions();
    default:
      return createReadOnlyPermissions();
  }
};
