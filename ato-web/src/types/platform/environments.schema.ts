import { z } from 'zod';

export const platformEnvironmentSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().optional(),
    profileId: z.string().min(1, 'Profile is required'),
    isDefault: z.boolean().optional(),
    credentials: z.object({
        username: z.string().min(1, 'Username is required'), // Or simpler auth
        passwordOrToken: z.string().optional(), // Optional to allow unchanged credentials on update
        executionInstanceId: z.string().min(1, 'Execution Instance is required')
    })
});

export type PlatformEnvironmentFormData = z.infer<typeof platformEnvironmentSchema>;
