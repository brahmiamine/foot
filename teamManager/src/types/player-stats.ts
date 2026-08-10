import { z } from "zod";

export const createPlayerStatSchema = z.object({
  playerIds: z.array(z.string().min(1)).min(1, "Sélectionnez au moins un joueur"),
  matchType: z.enum(["OFFICIAL", "FRIENDLY"]).optional().nullable(),
  matchId: z.string().min(1).optional().nullable(),
  friendlyMatchId: z.number().int().positive().optional().nullable(),
  season: z.string().max(20).optional().nullable(),
  minutesPlayed: z.number().int().min(0).max(200).default(0),
  goals: z.number().int().min(0).max(50).default(0),
  assists: z.number().int().min(0).max(50).default(0),
  yellowCards: z.number().int().min(0).max(10).default(0),
  redCards: z.number().int().min(0).max(5).default(0),
  injuriesCount: z.number().int().min(0).max(20).default(0),
  trainingsAttended: z.number().int().min(0).max(500).default(0),
  trainingsTotal: z.number().int().min(0).max(500).default(0),
  notes: z.string().max(500).optional().nullable(),
});

export const updatePlayerStatSchema = createPlayerStatSchema.omit({ playerIds: true }).partial().extend({
  playerId: z.string().min(1),
});

/**
 * Format CSV attendu pour l'import en masse (en-tête obligatoire, séparateur
 * virgule) :
 * number,season,minutesPlayed,goals,assists,yellowCards,redCards,injuriesCount,trainingsAttended,trainingsTotal,notes
 *
 * - `number` : numéro de maillot du joueur (doit exister dans l'effectif du club)
 * - `season` : optionnel, ex "2025-2026"
 * - le reste : entiers >= 0, colonnes optionnelles laissées vides = 0
 */
export const csvPlayerStatRowSchema = z.object({
  number: z.coerce.number().int(),
  season: z.string().max(20).optional().nullable(),
  minutesPlayed: z.coerce.number().int().min(0).default(0),
  goals: z.coerce.number().int().min(0).default(0),
  assists: z.coerce.number().int().min(0).default(0),
  yellowCards: z.coerce.number().int().min(0).default(0),
  redCards: z.coerce.number().int().min(0).default(0),
  injuriesCount: z.coerce.number().int().min(0).default(0),
  trainingsAttended: z.coerce.number().int().min(0).default(0),
  trainingsTotal: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
});

export const CSV_PLAYER_STAT_COLUMNS = [
  "number",
  "season",
  "minutesPlayed",
  "goals",
  "assists",
  "yellowCards",
  "redCards",
  "injuriesCount",
  "trainingsAttended",
  "trainingsTotal",
  "notes",
] as const;

export type CreatePlayerStatInput = z.infer<typeof createPlayerStatSchema>;
export type UpdatePlayerStatInput = z.infer<typeof updatePlayerStatSchema>;
export type CsvPlayerStatRow = z.infer<typeof csvPlayerStatRowSchema>;
