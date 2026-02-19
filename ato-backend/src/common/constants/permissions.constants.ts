/**
 * A centralized object that defines all permission strings used throughout the application.
 * Following a 'Resource:Action' convention (e.g., 'User:Create') makes permissions
 * easy to manage, read, and assign.
 *
 * This object is the single source of truth for authorization checks. The PermissionsGuard
 * reads metadata tagged with these constants to determine if a user can access an endpoint.
 * It is also the master list used in the UI for assigning permissions to Roles.
 */
export const PERMISSIONS = {
  // --- User Management ---
  // Permissions related to creating, viewing, and managing user accounts.
  USER_CREATE: 'User:Create',
  USER_VIEW: 'User:View',
  USER_EDIT: 'User:Edit',
  USER_DELETE: 'User:Delete',
  /**
   * Grants the ability to change a user's `isActive` status and to include
   * inactive user records in query results. This is a sensitive operation
   * separate from a standard edit.
   */
  USER_MANAGE_INACTIVE: 'User:ManageInactive',

  // --- Role Management ---
  // Permissions for managing user roles and their associated permissions.
  // These are typically restricted to top-level administrators.
  ROLE_CREATE: 'Role:Create',
  ROLE_VIEW: 'Role:View',
  ROLE_EDIT: 'Role:Edit',
  ROLE_DELETE: 'Role:Delete',
  /**
   * Grants the ability to change a role's `isActive` status and to
   * include inactive role records in query results.
   */
  ROLE_MANAGE_INACTIVE: 'Role:ManageInactive',

  // --- System Configuration ---
  // Permissions for managing system-level configurations, like recordId counters.
  COUNTERS_VIEW: 'Counters:View',
  COUNTERS_EDIT: 'Counters:Edit',

  SYSTEM_CONFIG_VIEW: 'SystemConfig:View',
  SYSTEM_CONFIG_EDIT: 'SystemConfig:Edit',

  // --- Audit Management ---
  AUDIT_VIEW: 'Audit:View',

  // --- Global & System-Wide Permissions ---
  // Special permissions that are not tied to a single resource's CRUD operations.
  /**
   * Grants the ability to query for records that have been soft-deleted
   * by using the `?isDeleted=true` query parameter. This is a powerful
   * permission intended only for administrators for data recovery or auditing.
   */
  VIEW_DELETED: 'Global:ViewDeleted',
};

/**
 * An enum that defines the standardized resource names used in permission strings.
 * This provides a single, type-safe source of truth for resource identifiers,
 * preventing the use of brittle, hardcoded strings throughout the application.
 */
export enum Resource {
  USER = 'User',
  ROLE = 'Role',
  COUNTERS = 'Counters',
  SYSTEM_CONFIG = 'SystemConfig',
}