import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";

/**
 * Player position enum (fiche site public, propre à teamManager)
 */
export const PLAYER_POSITIONS = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"] as const;

/**
 * Player status enum — partagé avec cardManager (système disciplinaire).
 * SUSPENDED n'est jamais choisi manuellement : il est positionné par la
 * logique de suspension de cardManager.
 */
export const PLAYER_STATUSES = ["TITULAR", "SUBSTITUTE", "BLANK", "ENTERING", "OUT_OF_LIST", "SUSPENDED"] as const;

/**
 * Validation schema for creating a player
 */
export const createPlayerSchema = z.object({
  firstNameFr: z.string().min(1, "Le prénom en français est requis").max(191, "Le prénom ne peut pas dépasser 191 caractères"),
  lastNameFr: z.string().min(1, "Le nom en français est requis").max(191, "Le nom ne peut pas dépasser 191 caractères"),
  firstNameAr: z.string().max(191, "Le prénom en arabe ne peut pas dépasser 191 caractères").optional().nullable(),
  lastNameAr: z.string().max(191, "Le nom en arabe ne peut pas dépasser 191 caractères").optional().nullable(),
  number: z.number().int().min(0).max(99),
  status: z.enum(PLAYER_STATUSES).optional(),
  birthDate: z.date().optional().nullable(),
  position: z.enum(PLAYER_POSITIONS).optional().nullable(),
  imageUrl: z.string().max(255).optional().nullable(),
  category: z.enum(AGE_CATEGORIES).default("seniors"),
});

/**
 * Validation schema for updating a player
 */
export const updatePlayerSchema = z.object({
  firstNameFr: z.string().min(1).max(191).optional(),
  lastNameFr: z.string().min(1).max(191).optional(),
  firstNameAr: z.string().max(191).optional().nullable(),
  lastNameAr: z.string().max(191).optional().nullable(),
  number: z.number().int().min(0).max(99).optional(),
  status: z.enum(PLAYER_STATUSES).optional(),
  isActive: z.boolean().optional(),
  birthDate: z.date().optional().nullable(),
  position: z.enum(PLAYER_POSITIONS).optional().nullable(),
  imageUrl: z.string().max(255).optional().nullable(),
  category: z.enum(AGE_CATEGORIES).optional(),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
