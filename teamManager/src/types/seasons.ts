import { z } from "zod";

export const SEASON_STATUSES = ["PLANNED", "ACTIVE", "ARCHIVED"] as const;

export const createSeasonSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(50),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(SEASON_STATUSES).default("PLANNED"),
  isCurrent: z.boolean().default(false),
});

export const updateSeasonSchema = createSeasonSchema.partial();

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;
export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>;
