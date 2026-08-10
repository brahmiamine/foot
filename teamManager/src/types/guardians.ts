import { z } from "zod";

export const createGuardianSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis").max(100),
  lastName: z.string().min(1, "Le nom est requis").max(100),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(191).optional().nullable().or(z.literal("")),
  address: z.string().max(255).optional().nullable(),
});

export const updateGuardianSchema = createGuardianSchema.partial();

export const linkGuardianPlayerSchema = z.object({
  guardianId: z.coerce.number().int().positive(),
  playerId: z.string().min(1, "Le joueur est requis"),
  relationship: z.string().max(50).optional().nullable(),
  isPrimary: z.boolean().default(false),
  hasCustody: z.boolean().default(true),
  receivesNotifications: z.boolean().default(true),
  receivesDocuments: z.boolean().default(true),
});

export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;
export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;
export type LinkGuardianPlayerInput = z.infer<typeof linkGuardianPlayerSchema>;
