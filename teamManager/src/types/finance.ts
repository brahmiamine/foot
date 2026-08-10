import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";

export const PAYMENT_METHODS = ["CASH", "TRANSFER", "CHECK", "OTHER"] as const;
export const PLAYER_FEE_STATUSES = ["PENDING", "PARTIAL", "PAID", "WAIVED"] as const;

export const createFeePlanSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(150),
  amount: z.coerce.number().positive("Le montant doit être positif"),
  seasonId: z.coerce.number().int().positive().optional().nullable(),
  category: z.enum(AGE_CATEGORIES).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export const assignFeeSchema = z.object({
  playerId: z.string().min(1, "Le joueur est requis"),
  feePlanId: z.coerce.number().int().positive().optional().nullable(),
  label: z.string().min(1, "Le libellé est requis").max(150),
  amountDue: z.coerce.number().positive("Le montant doit être positif"),
  dueDate: z.string().optional().nullable(),
});

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Le montant doit être positif"),
  method: z.enum(PAYMENT_METHODS).default("CASH"),
  paidAt: z.string().optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
});

export type CreateFeePlanInput = z.infer<typeof createFeePlanSchema>;
export type AssignFeeInput = z.infer<typeof assignFeeSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
