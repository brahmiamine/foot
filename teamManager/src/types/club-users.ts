import { z } from "zod";

export const createClubUserSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(191),
  email: z.string().email("Email invalide").max(191),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(100),
  isActive: z.boolean().default(true),
});

export const updateClubUserSchema = z.object({
  name: z.string().min(1).max(191).optional(),
  email: z.string().email().max(191).optional(),
  password: z.string().min(8).max(100).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type CreateClubUserInput = z.infer<typeof createClubUserSchema>;
export type UpdateClubUserInput = z.infer<typeof updateClubUserSchema>;
