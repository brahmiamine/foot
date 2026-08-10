import { z } from "zod";

export const INJURY_SEVERITIES = ["MINOR", "MODERATE", "SEVERE"] as const;
export const INJURY_STATUSES = ["ONGOING", "RECOVERING", "RESOLVED"] as const;

export const injuryDocumentSchema = z.object({ name: z.string().max(200), url: z.string().max(500) });

export const createInjurySchema = z.object({
  playerId: z.string().min(1, "Le joueur est requis"),
  injuryDate: z.string().min(1, "La date est requise"),
  zone: z.string().min(1, "La zone est requise").max(100),
  severity: z.enum(INJURY_SEVERITIES).default("MINOR"),
  description: z.string().max(500).optional().nullable(),
  diagnosis: z.string().max(500).optional().nullable(),
  unavailabilityDays: z.number().int().min(0).max(1000).optional().nullable(),
  expectedReturnDate: z.string().optional().nullable(),
  actualReturnDate: z.string().optional().nullable(),
  progressiveReturn: z.boolean().default(false),
  progressiveReturnNotes: z.string().max(500).optional().nullable(),
  documents: z.array(injuryDocumentSchema).max(20).default([]),
  status: z.enum(INJURY_STATUSES).default("ONGOING"),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateInjurySchema = createInjurySchema.omit({ playerId: true }).partial();

export type CreateInjuryInput = z.infer<typeof createInjurySchema>;
export type UpdateInjuryInput = z.infer<typeof updateInjurySchema>;
export type InjuryDocument = z.infer<typeof injuryDocumentSchema>;
