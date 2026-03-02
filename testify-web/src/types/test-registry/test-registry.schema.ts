import * as z from 'zod';

export const testRegistrySchema = z.object({
  targetComponentId: z.string().min(1, 'Target Component ID is required'),
  testComponentId: z.string().min(1, 'Test Component ID is required'),
  isActive: z.boolean().optional()
});

export type TestRegistryFormData = z.infer<typeof testRegistrySchema>;
