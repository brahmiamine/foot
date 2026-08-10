import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";

export const createInternalTeamSchema = z.object({
  seasonId: z.number().int().positive().optional().nullable(),
  name: z.string().min(1, "Le nom est requis").max(100),
  category: z.enum(AGE_CATEGORIES).default("seniors"),
  gender: z.enum(["male", "female", "mixed"]).default("male"),
  code: z.string().max(20).optional().nullable(),
});

export const updateInternalTeamSchema = createInternalTeamSchema.partial().extend({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export type CreateInternalTeamInput = z.infer<typeof createInternalTeamSchema>;
export type UpdateInternalTeamInput = z.infer<typeof updateInternalTeamSchema>;
