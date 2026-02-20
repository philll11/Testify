import { z } from 'zod';

export const createCredentialSchema = z.object({
    profileName: z.string().min(1, 'Profile Name is required'),
    platform: z.string().default('Boomi').optional(),
    accountId: z.string().min(1, 'Account ID is required'),
    username: z.string().min(1, 'Username is required'),
    passwordOrToken: z.string().min(1, 'Password/Token is required'),
    executionInstanceId: z.string().optional()
});

export type CreateCredentialSchema = z.infer<typeof createCredentialSchema>;
