import { z } from 'zod';
import { IntegrationPlatform } from './credential.types';

export const createCredentialSchema = z.object({
    profileName: z.string().min(1, 'Profile Name is required'),
    platform: z.enum(IntegrationPlatform).default(IntegrationPlatform.BOOMI).optional(),
    accountId: z.string().min(1, 'Account ID is required'),
    username: z.string().min(1, 'Username is required'),
    passwordOrToken: z.string().min(1, 'Password/Token is required'),
    executionInstanceId: z.string().optional()
});

export type CreateCredentialSchema = z.infer<typeof createCredentialSchema>;
