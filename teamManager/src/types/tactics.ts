import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";

/**
 * Types d'éléments disponibles dans la palette de l'éditeur de planche
 * tactique (glisser-déposer sur le terrain).
 */
export const BOARD_ELEMENT_TYPES = [
  "BALL",
  "GOAL",
  "MINI_GOAL",
  "RING",
  "DOME_CONE",
  "CONE",
  "PLAYER",
  "FLAG",
  "LADDER",
  "HURDLE",
  "POLE",
  "BIB",
  "TEXT",
  "ARROW",
  "LINE",
] as const;

const pointSchema = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) });

export const boardElementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(BOARD_ELEMENT_TYPES),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  color: z.string().max(20).optional().nullable(),
  number: z.number().int().min(0).max(99).optional().nullable(),
  text: z.string().max(100).optional().nullable(),
  /** Pour ARROW/LINE : point d'arrivée (le point de départ est x/y). */
  endPoint: pointSchema.optional().nullable(),
});

export const boardContentSchema = z.object({
  elements: z.array(boardElementSchema).max(300),
});

export const createTacticsBoardSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(AGE_CATEGORIES).optional().nullable(),
  isPublic: z.boolean().default(false),
  content: boardContentSchema,
});

export const updateTacticsBoardSchema = createTacticsBoardSchema.partial();

export type BoardElement = z.infer<typeof boardElementSchema>;
export type BoardContent = z.infer<typeof boardContentSchema>;
export type CreateTacticsBoardInput = z.infer<typeof createTacticsBoardSchema>;
export type UpdateTacticsBoardInput = z.infer<typeof updateTacticsBoardSchema>;
