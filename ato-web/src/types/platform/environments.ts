import { IntegrationPlatform } from './common';
import { PlatformProfile } from './profiles';

export interface PlatformEnvironment {
    id: string;
    name: string;
    description?: string;
    platformType: IntegrationPlatform;
    profileId: string;
    // Profile is only populated in GET /:id details view, not in list view
    profile?: PlatformProfile;
    // Credentials only populated in GET /:id, never in list
    credentials?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface PlatformCredentials {
    username?: string;
    token?: string;
    apiKey?: string;
    accountId?: string;
    // Flexible structure as per backend "Record<string, any>"
    [key: string]: any;
}

export interface CreatePlatformEnvironmentDto {
    name: string;
    description?: string;
    profileId: string;
    credentials: PlatformCredentials;
}

export interface UpdatePlatformEnvironmentDto {
    name?: string;
    description?: string;
    profileId?: string;
    credentials?: PlatformCredentials;
}
