import { z } from "zod";

/**
 * Validation schema for creating a media item
 */
export const createMediaItemSchema = z.object({
  url: z.string().min(1, "L'URL est requise").max(255, "L'URL ne peut pas dépasser 255 caractères"),
  type: z.enum(["IMAGE", "VIDEO", "DOCUMENT", "AUDIO"], {
    error: "Le type doit être IMAGE, VIDEO, DOCUMENT ou AUDIO",
  }),
  mimeType: z.string().max(100, "Le type MIME ne peut pas dépasser 100 caractères").optional().nullable(),
  altTextFr: z.string().max(255, "Le texte alternatif ne peut pas dépasser 255 caractères").optional().nullable(),
  altTextAr: z.string().max(255, "Le texte alternatif ne peut pas dépasser 255 caractères").optional().nullable(),
  uploaderId: z.number().int().positive().optional().nullable(),
});

/**
 * Validation schema for updating a media item
 */
export const updateMediaItemSchema = z.object({
  url: z.string().min(1).max(255).optional(),
  type: z.enum(["IMAGE", "VIDEO", "DOCUMENT", "AUDIO"]).optional(),
  mimeType: z.string().max(100).optional().nullable(),
  altTextFr: z.string().max(255).optional().nullable(),
  altTextAr: z.string().max(255).optional().nullable(),
});

/**
 * Validation schema for creating a media gallery
 */
export const createMediaGallerySchema = z.object({
  titleFr: z.string().min(1, "Le titre en français est requis").max(200, "Le titre ne peut pas dépasser 200 caractères"),
  titleAr: z.string().max(200, "Le titre en arabe ne peut pas dépasser 200 caractères").optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  coverImageId: z.number().int().positive().optional().nullable(),
  isPublic: z.boolean().optional(),
});

/**
 * Validation schema for updating a media gallery
 */
export const updateMediaGallerySchema = z.object({
  titleFr: z.string().min(1).max(200).optional(),
  titleAr: z.string().max(200).optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  coverImageId: z.number().int().positive().optional().nullable(),
  isPublic: z.boolean().optional(),
});

export type CreateMediaItemInput = z.infer<typeof createMediaItemSchema>;
export type UpdateMediaItemInput = z.infer<typeof updateMediaItemSchema>;
export type CreateMediaGalleryInput = z.infer<typeof createMediaGallerySchema>;
export type UpdateMediaGalleryInput = z.infer<typeof updateMediaGallerySchema>;

