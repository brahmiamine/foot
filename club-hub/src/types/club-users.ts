import { z } from "zod";

const optionalAccessInstant = z.string().datetime({ offset: true }).nullable().optional();

function hasValidWindow(values: { accessValidFrom?: string | null; accessValidUntil?: string | null }) {
  if (!values.accessValidFrom || !values.accessValidUntil) return true;
  return new Date(values.accessValidFrom).getTime() < new Date(values.accessValidUntil).getTime();
}

export const createClubUserSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(191),
  email: z.string().email("Email invalide").max(191),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(100),
  isActive: z.boolean().default(true),
  accessValidFrom: optionalAccessInstant,
  accessValidUntil: optionalAccessInstant,
}).refine(hasValidWindow, {
  message: "La fin de l'accès doit être postérieure au début",
  path: ["accessValidUntil"],
});

export const updateClubUserSchema = z.object({
  name: z.string().min(1).max(191).optional(),
  email: z.string().email().max(191).optional(),
  password: z.string().min(8).max(100).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  accessValidFrom: optionalAccessInstant,
  accessValidUntil: optionalAccessInstant,
}).refine(hasValidWindow, {
  message: "La fin de l'accès doit être postérieure au début",
  path: ["accessValidUntil"],
});

export type CreateClubUserInput = z.infer<typeof createClubUserSchema>;
export type UpdateClubUserInput = z.infer<typeof updateClubUserSchema>;