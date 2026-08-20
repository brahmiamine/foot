import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

const permissionEnum = z.enum(ALL_PERMISSION_KEYS as [string, ...string[]]);
const optionalIsoDate = z.string().datetime({ offset: true }).optional().nullable();

export const createRoleSchema = z.object({
  name: z.string().min(1, "Le nom du rôle est requis").max(100),
  description: z.string().max(255).optional().nullable(),
  isGlobal: z.boolean().default(false),
  permissions: z.array(permissionEnum).default([]),
});

export const updateRoleSchema = createRoleSchema.partial();

export const assignRoleSchema = z.object({
  userId: z.string().min(1, "Le compte est requis"),
  roleId: z.coerce.number().int().positive("Le rôle est requis"),
  category: z.enum(AGE_CATEGORIES).optional().nullable(),
  validFrom: optionalIsoDate,
  validUntil: optionalIsoDate,
  reason: z.string().max(1000).optional().nullable(),
}).superRefine((value, context) => {
  if (!value.validFrom && !value.validUntil) return;
  if (!value.reason?.trim()) {
    context.addIssue({ code: "custom", path: ["reason"], message: "Un motif est obligatoire pour un rôle temporaire" });
  }
  if (value.validFrom && value.validUntil && new Date(value.validUntil).getTime() <= new Date(value.validFrom).getTime()) {
    context.addIssue({ code: "custom", path: ["validUntil"], message: "La fin doit être postérieure au début" });
  }
});

export const createRoleDelegationSchema = z.object({
  delegateeUserId: z.string().min(1, "Le destinataire est requis"),
  permissions: z.array(permissionEnum).min(1, "Au moins une permission est requise"),
  category: z.enum(AGE_CATEGORIES).optional().nullable(),
  validFrom: z.string().datetime({ offset: true }),
  validUntil: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(3, "Un motif de délégation est obligatoire").max(1000),
}).superRefine((value, context) => {
  if (new Date(value.validUntil).getTime() <= new Date(value.validFrom).getTime()) {
    context.addIssue({ code: "custom", path: ["validUntil"], message: "La fin doit être postérieure au début" });
  }
});

export const revokeRoleDelegationSchema = z.object({
  delegationId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3, "Un motif de révocation est obligatoire").max(1000),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type CreateRoleDelegationInput = z.infer<typeof createRoleDelegationSchema>;
