import { z } from 'zod';

export const platformEnvironmentSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().optional(),
    profileId: z.string().min(1, 'Profile is required'),
    credentials: z.object({
        username: z.string().min(1, 'Username is required'), // Or simpler auth
        token: z.string().min(1, 'Token is required'), // Required on create
        executionInstance: z.string().min(1, 'Execution Instance is required')
    })
});

export type PlatformEnvironmentFormData = z.infer<typeof platformEnvironmentSchema>;
