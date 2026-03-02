import { z } from 'zod';

export const roleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

export type RoleFormData = z.infer<typeof roleSchema>;
