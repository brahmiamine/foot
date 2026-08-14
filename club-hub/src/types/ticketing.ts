import { z } from "zod";

export const createTicketCategorySchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(191),
  description: z.string().max(2000).optional().nullable(),
  basePrice: z.number().nonnegative("Le prix doit être positif ou nul"),
  isActive: z.boolean().default(true),
});

export const updateTicketCategorySchema = z.object({
  name: z.string().min(1).max(191).optional(),
  description: z.string().max(2000).optional().nullable(),
  basePrice: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const upsertMatchOfferSchema = z.object({
  categoryId: z.string().min(1, "Choisissez une catégorie"),
  price: z.number().nonnegative("Le prix doit être positif ou nul"),
  capacity: z.number().int().positive("La capacité doit être supérieure à 0"),
  allowedAudience: z.enum(["PUBLIC", "HOME_SUPPORTERS", "AWAY_SUPPORTERS"]).default("PUBLIC"),
  maxTicketsPerUser: z.number().int().positive().default(4),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
});
