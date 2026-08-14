import { z } from "zod";

const urlOrPathSchema = z
  .union([z.string().url(), z.string().regex(/^\/[^/].*/, "Le chemin doit commencer par /"), z.literal("")])
  .optional()
  .nullable()
  .transform((val) => (val === "" ? null : val));

export const createProductCategorySchema = z.object({
  nameFr: z.string().min(1, "Le nom en français est requis").max(150),
  nameAr: z.string().max(150).optional().nullable(),
});

export const updateProductCategorySchema = z.object({
  nameFr: z.string().min(1).max(150).optional(),
  nameAr: z.string().max(150).optional().nullable(),
});

export const createProductSchema = z.object({
  categoryId: z.number().int().positive().optional().nullable(),
  nameFr: z.string().min(1, "Le nom en français est requis").max(200),
  nameAr: z.string().max(200).optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  price: z.number().nonnegative("Le prix doit être positif"),
  stock: z.number().int().nonnegative("Le stock doit être positif ou nul").default(0),
  imageUrl: urlOrPathSchema,
  isActive: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  categoryId: z.number().int().positive().optional().nullable(),
  nameFr: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  imageUrl: urlOrPathSchema,
  isActive: z.boolean().optional(),
});

export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
