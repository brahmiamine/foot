import { z } from "zod";

export const MATCH_EVENT_TYPES = [
  "GOAL",
  "OWN_GOAL",
  "ASSIST",
  "YELLOW_CARD",
  "RED_CARD",
  "SUBSTITUTION_IN",
  "SUBSTITUTION_OUT",
  "INJURY",
] as const;

export const MATCH_EVENT_LABELS: Record<(typeof MATCH_EVENT_TYPES)[number], string> = {
  GOAL: "⚽ But",
  OWN_GOAL: "⚽ Contre son camp",
  ASSIST: "🎯 Passe décisive",
  YELLOW_CARD: "🟨 Carton jaune",
  RED_CARD: "🟥 Carton rouge",
  SUBSTITUTION_IN: "🔵 Entrée",
  SUBSTITUTION_OUT: "🔴 Sortie",
  INJURY: "🩹 Blessure",
};

export const createMatchEventSchema = z.object({
  matchType: z.enum(["OFFICIAL", "FRIENDLY"]),
  matchId: z.string().optional().nullable(),
  friendlyMatchId: z.coerce.number().int().positive().optional().nullable(),
  eventType: z.enum(MATCH_EVENT_TYPES),
  teamSide: z.enum(["HOME", "AWAY"]),
  playerId: z.string().optional().nullable(),
  relatedPlayerId: z.string().optional().nullable(),
  minute: z.coerce.number().int().min(0).max(150).optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
});

export type CreateMatchEventInput = z.infer<typeof createMatchEventSchema>;
