import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";

export const createNotificationSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200, "Le titre ne peut pas dépasser 200 caractères"),
  message: z.string().min(1, "Le message est requis"),
  targetType: z.enum(["ALL", "PLAYERS", "STAFF", "TEAM_MEMBERS"]).default("ALL"),
  category: z.enum(AGE_CATEGORIES).optional().nullable(),
  isUrgent: z.boolean().default(false),
  matchId: z.string().optional().nullable(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
