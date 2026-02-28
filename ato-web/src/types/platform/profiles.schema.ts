import { z } from 'zod';
import { IntegrationPlatform } from './common';

export const platformProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  accountId: z.string().min(1, 'Account ID is required'),
  description: z.string().optional(),
  platformType: z.enum(IntegrationPlatform),
  config: z.object({
    pollInterval: z.number().min(100, 'Minimum 100ms').max(60000, 'Maximum 60s'),
    maxPolls: z.number().min(1).max(1000)
  })
});

export type PlatformProfileFormData = z.infer<typeof platformProfileSchema>;
