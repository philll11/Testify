import { IntegrationPlatform } from './common';

export interface PlatformProfileConfig {
    pollInterval: number;
    maxPolls: number;
}

export interface PlatformProfile {
    id: string;
    name: string;
    accountId: string;
    description?: string;
    platformType: IntegrationPlatform;
    isDefault: boolean;
    config: PlatformProfileConfig;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePlatformProfileDto {
    name: string;
    accountId: string;
    description?: string;
    platformType: IntegrationPlatform;
    isDefault?: boolean;
    config: PlatformProfileConfig;
}

export interface UpdatePlatformProfileDto {
    name?: string;
    accountId?: string;
    description?: string;
    isDefault?: boolean;
    config?: PlatformProfileConfig;
}
