import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format hexadécimal, ex: #C9A227)")
  .optional()
  .nullable();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)");

export const createSubscriptionCategorySchema = z
  .object({
    name: z.string().min(1, "Le nom est requis").max(191),
    description: z.string().max(2000).optional().nullable(),
    price: z.number().nonnegative("Le prix doit être positif ou nul"),
    color: hexColor,
    validFrom: isoDate,
    validUntil: isoDate,
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.validFrom <= data.validUntil, {
    message: "La date de fin doit être postérieure ou égale à la date de début",
    path: ["validUntil"],
  });

export const updateSubscriptionCategorySchema = z
  .object({
    name: z.string().min(1).max(191).optional(),
    description: z.string().max(2000).optional().nullable(),
    price: z.number().nonnegative().optional(),
    color: hexColor,
    validFrom: isoDate.optional(),
    validUntil: isoDate.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => !data.validFrom || !data.validUntil || data.validFrom <= data.validUntil, {
    message: "La date de fin doit être postérieure ou égale à la date de début",
    path: ["validUntil"],
  });
