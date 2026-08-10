import { z } from "zod";

export const PLAYER_OBJECTIVE_STATUSES = ["IN_PROGRESS", "ACHIEVED", "MISSED"] as const;

const scoreSchema = z.coerce.number().int().min(0).max(20).optional().nullable();

export const createEvaluationSchema = z.object({
  playerId: z.string().min(1, "Le joueur est requis"),
  seasonId: z.coerce.number().int().positive().optional().nullable(),
  evaluationDate: z.string().min(1, "La date est requise"),
  technicalScore: scoreSchema,
  tacticalScore: scoreSchema,
  physicalScore: scoreSchema,
  mentalScore: scoreSchema,
  comment: z.string().max(1000).optional().nullable(),
});

export const createObjectiveSchema = z.object({
  playerId: z.string().min(1, "Le joueur est requis"),
  evaluationId: z.coerce.number().int().positive().optional().nullable(),
  title: z.string().min(1, "Le titre est requis").max(200),
  description: z.string().max(500).optional().nullable(),
  targetDate: z.string().optional().nullable(),
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>;
