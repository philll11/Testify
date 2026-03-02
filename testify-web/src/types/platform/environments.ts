import { IntegrationPlatform } from './common';
import { PlatformProfile } from './profiles';

export interface PlatformEnvironment {
  id: string;
  name: string;
  description?: string;
  platformType: IntegrationPlatform;
  profileId: string;
  isDefault: boolean;
  // Profile is only populated in GET /:id details view, not in list view
  profile?: PlatformProfile;
  // Credentials only populated in GET /:id, never in list
  credentials?: PlatformCredentials;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformCredentials {
  username?: string;
  passwordOrToken?: string;
  executionInstanceId?: string;
}

export interface CreatePlatformEnvironmentDto {
  name: string;
  description?: string;
  profileId: string;
  isDefault?: boolean;
  credentials: PlatformCredentials;
}

export interface UpdatePlatformEnvironmentDto {
  name?: string;
  description?: string;
  profileId?: string;
  isDefault?: boolean;
  credentials?: PlatformCredentials;
}
