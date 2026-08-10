import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";

export const TRAINING_TYPES = ["TECHNIQUE", "PHYSIQUE", "TACTIQUE", "PREPARATION_MATCH", "RECUPERATION", "AUTRE"] as const;
export const TRAINING_STATUSES = ["SCHEDULED", "DONE", "CANCELLED"] as const;

export const createTrainingSchema = z.object({
  category: z.enum(AGE_CATEGORIES).default("seniors"),
  title: z.string().min(1, "Le titre est requis").max(200),
  trainingType: z.enum(TRAINING_TYPES).default("AUTRE"),
  date: z.date({ error: "La date est requise" }),
  durationMinutes: z.number().int().positive().optional().nullable(),
  stadiumId: z.number().int().positive().optional().nullable(),
  venueName: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateTrainingSchema = z.object({
  category: z.enum(AGE_CATEGORIES).optional(),
  title: z.string().min(1).max(200).optional(),
  trainingType: z.enum(TRAINING_TYPES).optional(),
  date: z.date().optional(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  stadiumId: z.number().int().positive().optional().nullable(),
  venueName: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(TRAINING_STATUSES).optional(),
});

export const inviteToTrainingSchema = z.object({
  trainingId: z.coerce.number().int().positive(),
  playerIds: z.array(z.string().min(1)).min(1, "Sélectionnez au moins un joueur"),
});

export const updateTrainingInvitationResponseSchema = z.object({
  response: z.enum(["PENDING", "PRESENT", "ABSENT"]),
});

export type CreateTrainingInput = z.infer<typeof createTrainingSchema>;
export type UpdateTrainingInput = z.infer<typeof updateTrainingSchema>;
export type InviteToTrainingInput = z.infer<typeof inviteToTrainingSchema>;
