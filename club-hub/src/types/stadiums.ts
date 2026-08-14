import { z } from "zod";

/**
 * Validation schema for URL or file path (optional, can be empty string, valid URL, or relative path)
 */
const urlOrPathSchema = z
  .union([
    z.string().url(), // Full URL (https://example.com/image.png)
    z.string().regex(/^\/[^/].*/, "Le chemin doit commencer par /"), // Relative path (/uploads/stadiums/image.png)
    z.literal(""), // Empty string
  ])
  .optional()
  .nullable()
  .transform((val) => (val === "" ? null : val));

/**
 * Validation schema for creating a stadium
 */
const facilityTypeSchema = z.enum(["STADIUM", "TRAINING_GROUND", "LOCKER_ROOM", "GYM", "SPORTS_CENTER", "OTHER"]);

export const createStadiumSchema = z.object({
  nameFr: z.string().min(1, "Le nom en français est requis").max(200, "Le nom ne peut pas dépasser 200 caractères"),
  nameAr: z.string().max(200, "Le nom en arabe ne peut pas dépasser 200 caractères").optional().nullable(),
  addressFr: z.string().max(255, "L'adresse en français ne peut pas dépasser 255 caractères").optional().nullable(),
  addressAr: z.string().max(255, "L'adresse en arabe ne peut pas dépasser 255 caractères").optional().nullable(),
  cityFr: z.string().max(100, "La ville en français ne peut pas dépasser 100 caractères").optional().nullable(),
  cityAr: z.string().max(100, "La ville en arabe ne peut pas dépasser 100 caractères").optional().nullable(),
  isHome: z.boolean().default(false),
  facilityType: facilityTypeSchema.default("STADIUM"),
  capacity: z.number().int().positive().optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  imageUrl: urlOrPathSchema,
});

/**
 * Validation schema for updating a stadium
 */
export const updateStadiumSchema = z.object({
  nameFr: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional().nullable(),
  addressFr: z.string().max(255).optional().nullable(),
  addressAr: z.string().max(255).optional().nullable(),
  cityFr: z.string().max(100).optional().nullable(),
  cityAr: z.string().max(100).optional().nullable(),
  isHome: z.boolean().optional(),
  facilityType: facilityTypeSchema.optional(),
  capacity: z.number().int().positive().optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  imageUrl: urlOrPathSchema,
});

export type CreateStadiumInput = z.infer<typeof createStadiumSchema>;
export type UpdateStadiumInput = z.infer<typeof updateStadiumSchema>;

