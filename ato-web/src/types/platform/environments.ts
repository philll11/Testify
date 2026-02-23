import { IntegrationPlatform } from './common';
import { PlatformProfile } from './profiles';

export interface PlatformEnvironment {
    id: string;
    name: string;
    description?: string;
    platformType: IntegrationPlatform;
    profileId: string;
    profile?: PlatformProfile;
    createdAt: string;
    updatedAt: string;
}

export interface PlatformCredentials {
    username: string;
    token: string; // Password/Token
    executionInstance: string;
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
    credentials?: Partial<PlatformCredentials>; // Backend handles partial updates logic if implemented
}
