import * as z from 'zod';

export const testRegistrySchema = z.object({
  profileId: z.string().optional(),
  targetComponentId: z.string().min(1, 'Target Component ID is required'),
  targetComponentName: z.string().optional(),
  testComponentId: z.string().min(1, 'Test Component ID is required'),
  testComponentName: z.string().optional(),
  isActive: z.boolean().optional()
});

export type TestRegistryFormData = z.infer<typeof testRegistrySchema>;
