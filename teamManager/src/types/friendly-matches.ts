import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";

export const FRIENDLY_MATCH_STATUSES = ["UPCOMING", "IN_PROGRESS", "FINISHED", "CANCELLED"] as const;

export const createFriendlyMatchSchema = z
  .object({
    category: z.enum(AGE_CATEGORIES).default("seniors"),
    opponentTeamId: z.string().min(1).optional().nullable(),
    opponentName: z.string().max(200).optional().nullable(),
    opponentLogoUrl: z.string().max(255).optional().nullable(),
    isHome: z.boolean().default(true),
    stadiumId: z.number().int().positive().optional().nullable(),
    venueName: z.string().max(200).optional().nullable(),
    date: z.date({ error: "La date est requise" }),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((data) => !!data.opponentTeamId || !!(data.opponentName && data.opponentName.trim()), {
    message: "Choisissez un club existant ou renseignez le nom de l'adversaire",
    path: ["opponentName"],
  });

export const updateFriendlyMatchSchema = z.object({
  category: z.enum(AGE_CATEGORIES).optional(),
  opponentTeamId: z.string().min(1).optional().nullable(),
  opponentName: z.string().max(200).optional().nullable(),
  opponentLogoUrl: z.string().max(255).optional().nullable(),
  isHome: z.boolean().optional(),
  stadiumId: z.number().int().positive().optional().nullable(),
  venueName: z.string().max(200).optional().nullable(),
  date: z.date().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const setFriendlyMatchResultSchema = z.object({
  status: z.enum(FRIENDLY_MATCH_STATUSES),
  scoreHome: z.number().int().min(0).optional().nullable(),
  scoreAway: z.number().int().min(0).optional().nullable(),
});

export type CreateFriendlyMatchInput = z.infer<typeof createFriendlyMatchSchema>;
export type UpdateFriendlyMatchInput = z.infer<typeof updateFriendlyMatchSchema>;
export type SetFriendlyMatchResultInput = z.infer<typeof setFriendlyMatchResultSchema>;
