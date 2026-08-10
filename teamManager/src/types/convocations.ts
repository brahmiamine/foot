import { z } from "zod";

export const createConvocationSchema = z.object({
  matchType: z.enum(["OFFICIAL", "FRIENDLY"]).default("OFFICIAL"),
  matchId: z.string().min(1).optional().nullable(),
  friendlyMatchId: z.number().int().positive().optional().nullable(),
  playerIds: z.array(z.string().min(1)).min(1, "Sélectionnez au moins un joueur"),
  notes: z.string().max(255).optional().nullable(),
});

export const updateConvocationResponseSchema = z.object({
  response: z.enum(["PENDING", "PRESENT", "ABSENT"]),
});

export type CreateConvocationInput = z.infer<typeof createConvocationSchema>;
export type UpdateConvocationResponseInput = z.infer<typeof updateConvocationResponseSchema>;
