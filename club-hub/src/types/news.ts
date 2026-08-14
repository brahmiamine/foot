import { z } from "zod";

/**
 * Validation schema for creating a news article
 */
export const createNewsSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200, "Le titre ne peut pas dépasser 200 caractères"),
  contentHtml: z.string().min(1, "Le contenu est requis"),
  coverImage: z.string().max(255).optional().nullable(),
  authorId: z.number().int().positive().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  isPublished: z.boolean().optional(),
  publishedAt: z.date().optional().nullable(),
});

/**
 * Validation schema for updating a news article
 */
export const updateNewsSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contentHtml: z.string().min(1).optional(),
  coverImage: z.string().max(255).optional().nullable(),
  authorId: z.number().int().positive().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  isPublished: z.boolean().optional(),
  publishedAt: z.date().optional().nullable(),
});

export type CreateNewsInput = z.infer<typeof createNewsSchema>;
export type UpdateNewsInput = z.infer<typeof updateNewsSchema>;

