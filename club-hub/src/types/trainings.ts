import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";

export const TRAINING_TYPES = ["TECHNIQUE", "PHYSIQUE", "TACTIQUE", "PREPARATION_MATCH", "RECUPERATION", "AUTRE"] as const;
export const TRAINING_STATUSES = ["SCHEDULED", "DONE", "CANCELLED"] as const;
export const TRAINING_INTENSITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const TRAINING_BLOCK_TYPES = ["WARMUP", "TECHNIQUE", "SMALL_SIDED_GAME", "TACTICS", "MATCH", "PHYSICAL", "RECOVERY", "OTHER"] as const;
export const TRAINING_INVITATION_RESPONSES = ["PENDING", "PRESENT", "ABSENT", "LATE", "INJURED"] as const;

export const trainingBlockSchema = z.object({
  blockType: z.enum(TRAINING_BLOCK_TYPES).default("OTHER"),
  label: z.string().min(1, "Le libellé est requis").max(200),
  durationMinutes: z.number().int().positive().max(600).default(15),
  notes: z.string().max(500).optional().nullable(),
  tacticsBoardId: z.number().int().positive().optional().nullable(),
});

export const createTrainingSchema = z.object({
  category: z.enum(AGE_CATEGORIES).default("seniors"),
  title: z.string().min(1, "Le titre est requis").max(200),
  objective: z.string().max(500).optional().nullable(),
  trainingType: z.enum(TRAINING_TYPES).default("AUTRE"),
  intensity: z.enum(TRAINING_INTENSITIES).optional().nullable(),
  date: z.date({ error: "La date est requise" }),
  durationMinutes: z.number().int().positive().optional().nullable(),
  equipment: z.string().max(500).optional().nullable(),
  stadiumId: z.number().int().positive().optional().nullable(),
  venueName: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  blocks: z.array(trainingBlockSchema).max(20).default([]),
});

export const updateTrainingSchema = z.object({
  category: z.enum(AGE_CATEGORIES).optional(),
  title: z.string().min(1).max(200).optional(),
  objective: z.string().max(500).optional().nullable(),
  trainingType: z.enum(TRAINING_TYPES).optional(),
  intensity: z.enum(TRAINING_INTENSITIES).optional().nullable(),
  date: z.date().optional(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  equipment: z.string().max(500).optional().nullable(),
  stadiumId: z.number().int().positive().optional().nullable(),
  venueName: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(TRAINING_STATUSES).optional(),
  blocks: z.array(trainingBlockSchema).max(20).optional(),
});

export const inviteToTrainingSchema = z.object({
  trainingId: z.coerce.number().int().positive(),
  playerIds: z.array(z.string().min(1)).min(1, "Sélectionnez au moins un joueur"),
});

export const updateTrainingInvitationResponseSchema = z.object({
  response: z.enum(TRAINING_INVITATION_RESPONSES),
});

export type TrainingBlockInput = z.infer<typeof trainingBlockSchema>;
export type CreateTrainingInput = z.infer<typeof createTrainingSchema>;
export type UpdateTrainingInput = z.infer<typeof updateTrainingSchema>;
export type InviteToTrainingInput = z.infer<typeof inviteToTrainingSchema>;
