import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

export const createRoleSchema = z.object({
  name: z.string().min(1, "Le nom du rôle est requis").max(100),
  description: z.string().max(255).optional().nullable(),
  isGlobal: z.boolean().default(false),
  permissions: z.array(z.enum(ALL_PERMISSION_KEYS as [string, ...string[]])).default([]),
});

export const updateRoleSchema = createRoleSchema.partial();

export const assignRoleSchema = z.object({
  userId: z.string().min(1, "Le compte est requis"),
  roleId: z.coerce.number().int().positive("Le rôle est requis"),
  category: z.enum(AGE_CATEGORIES).optional().nullable(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
