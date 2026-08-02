import { z } from "zod";

/**
 * Staff type enum
 */
export const STAFF_TYPES = ["COACH", "ADJOINT", "KINE", "MEDECIN", "PREPARATEUR", "ANALYSTE", "EQUIPEMENTIER", "COMMUNICATION", "AUTRE"] as const;

/**
 * Validation schema for creating a staff member
 */
export const createStaffSchema = z.object({
  firstNameFr: z.string().min(1, "Le prénom en français est requis").max(100, "Le prénom ne peut pas dépasser 100 caractères"),
  lastNameFr: z.string().min(1, "Le nom en français est requis").max(100, "Le nom ne peut pas dépasser 100 caractères"),
  firstNameAr: z.string().max(100, "Le prénom en arabe ne peut pas dépasser 100 caractères").optional().nullable(),
  lastNameAr: z.string().max(100, "Le nom en arabe ne peut pas dépasser 100 caractères").optional().nullable(),
  birthDate: z.date({ error: "La date de naissance est requise" }),
  phone: z.string().max(30, "Le numéro de téléphone ne peut pas dépasser 30 caractères").optional().nullable(),
  imageUrl: z.string().max(255).optional().nullable(),
  staffType: z.enum(STAFF_TYPES),
  userId: z.number().int().positive().optional().nullable(),
});

/**
 * Validation schema for updating a staff member
 */
export const updateStaffSchema = z.object({
  firstNameFr: z.string().min(1).max(100).optional(),
  lastNameFr: z.string().min(1).max(100).optional(),
  firstNameAr: z.string().max(100).optional().nullable(),
  lastNameAr: z.string().max(100).optional().nullable(),
  birthDate: z.date().optional(),
  phone: z.string().max(30).optional().nullable(),
  imageUrl: z.string().max(255).optional().nullable(),
  staffType: z.enum(STAFF_TYPES).optional(),
  userId: z.number().int().positive().optional().nullable(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

