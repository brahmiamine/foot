import { z } from "zod";

const lineupEntrySchema = z.object({
  playerId: z.string().min(1),
  role: z.enum(["STARTER", "SUBSTITUTE"]),
  shirtNumber: z.number().int().positive().optional().nullable(),
  position: z.string().max(50).optional().nullable(),
  posX: z.number().min(0).max(100).optional().nullable(),
  posY: z.number().min(0).max(100).optional().nullable(),
  isCaptain: z.boolean().default(false),
});

/**
 * Remplace intégralement la composition d'un match (officiel ou amical)
 * pour l'équipe du club connecté (liste complète titulaires + remplaçants
 * envoyée à chaque sauvegarde, plus simple/robuste qu'un diff incrémental
 * côté client).
 */
export const saveLineupSchema = z.object({
  matchType: z.enum(["OFFICIAL", "FRIENDLY"]).default("OFFICIAL"),
  matchId: z.string().min(1).optional().nullable(),
  friendlyMatchId: z.number().int().positive().optional().nullable(),
  entries: z
    .array(lineupEntrySchema)
    .refine((entries) => entries.filter((e) => e.role === "STARTER").length <= 11, {
      message: "Un maximum de 11 titulaires est autorisé",
    })
    .refine((entries) => entries.filter((e) => e.isCaptain).length <= 1, {
      message: "Un seul capitaine peut être désigné",
    })
    .refine((entries) => new Set(entries.map((e) => e.playerId)).size === entries.length, {
      message: "Un même joueur ne peut apparaître qu'une seule fois",
    }),
});

export type LineupEntryInput = z.infer<typeof lineupEntrySchema>;
export type SaveLineupInput = z.infer<typeof saveLineupSchema>;
