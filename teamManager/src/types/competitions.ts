import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";

export const COMPETITION_TYPES = ["TOURNAMENT", "CUP", "INTERNAL_LEAGUE", "FRIENDLY_SERIES", "OTHER"] as const;
export const COMPETITION_FORMATS = ["LEAGUE", "GROUPS", "KNOCKOUT"] as const;
export const COMPETITION_STATUSES = ["PLANNED", "ACTIVE", "FINISHED"] as const;

export const createCompetitionSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(150),
  type: z.enum(COMPETITION_TYPES).default("TOURNAMENT"),
  category: z.enum(AGE_CATEGORIES).optional().nullable(),
  format: z.enum(COMPETITION_FORMATS).default("LEAGUE"),
  pointsWin: z.coerce.number().int().min(0).default(3),
  pointsDraw: z.coerce.number().int().min(0).default(1),
  pointsLoss: z.coerce.number().int().min(0).default(0),
  seasonId: z.coerce.number().int().positive().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const updateCompetitionSchema = createCompetitionSchema.partial().extend({
  status: z.enum(COMPETITION_STATUSES).optional(),
});

export const addCompetitionParticipantSchema = z
  .object({
    internalTeamId: z.coerce.number().int().positive().optional().nullable(),
    externalTeamId: z.string().optional().nullable(),
    externalName: z.string().max(200).optional().nullable(),
    logoUrl: z.string().max(255).optional().nullable(),
  })
  .refine((data) => Boolean(data.internalTeamId || data.externalTeamId || (data.externalName && data.externalName.trim())), {
    message: "Choisissez une équipe interne, un club référencé ou saisissez un nom",
  });

export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionSchema>;
export type AddCompetitionParticipantInput = z.infer<typeof addCompetitionParticipantSchema>;
