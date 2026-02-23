export const PERMISSIONS = {
  // --- User Management ---
  USER_CREATE: 'User:Create',
  USER_VIEW: 'User:View',
  USER_EDIT: 'User:Edit',
  USER_DELETE: 'User:Delete',
  USER_MANAGE_INACTIVE: 'User:ManageInactive',

  // --- Role Management ---
  ROLE_CREATE: 'Role:Create',
  ROLE_VIEW: 'Role:View',
  ROLE_EDIT: 'Role:Edit',
  ROLE_DELETE: 'Role:Delete',
  ROLE_MANAGE_INACTIVE: 'Role:ManageInactive',

  // --- System Configuration ---
  SYSTEM_CONFIG_VIEW: 'SystemConfig:View',
  SYSTEM_CONFIG_EDIT: 'SystemConfig:Edit',
  COUNTERS_VIEW: 'Counters:View',
  COUNTERS_EDIT: 'Counters:Edit',
  AUDIT_VIEW: 'Audit:View',

  // --- Integration Tools ---
  PLATFORM_PROFILE_VIEW: 'PlatformProfile:View',
  PLATFORM_PROFILE_EDIT: 'PlatformProfile:Edit',
  PLATFORM_PROFILE_CREATE: 'PlatformProfile:Create',
  PLATFORM_PROFILE_DELETE: 'PlatformProfile:Delete',

  PLATFORM_ENVIRONMENT_VIEW: 'PlatformEnvironment:View',
  PLATFORM_ENVIRONMENT_EDIT: 'PlatformEnvironment:Edit',
  PLATFORM_ENVIRONMENT_CREATE: 'PlatformEnvironment:Create',
  PLATFORM_ENVIRONMENT_DELETE: 'PlatformEnvironment:Delete',

  // --- Global ---
  VIEW_DELETED: 'Global:ViewDeleted',
};

export const DOMAIN_MAPPING: Record<string, string[]> = {
  'Identity & Access': ['User', 'Role'],
  'System': ['SystemConfig', 'Counters', 'Audit', 'Global'],
};

export enum Resource {
  USER = 'User',
  ROLE = 'Role',
  COUNTERS = 'Counters',
  SYSTEM_CONFIG = 'SystemConfig',
  PLATFORM_PROFILE = 'PlatformProfile',
  PLATFORM_ENVIRONMENT = 'PlatformEnvironment',
  GLOBAL = 'Global',
}
