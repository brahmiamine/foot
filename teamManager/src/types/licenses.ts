import { z } from "zod";

export const LICENSE_TYPES = ["PLAYER", "COACH", "EXECUTIVE", "OTHER"] as const;
export const LICENSE_STATUSES = ["PENDING", "ACTIVE", "EXPIRED", "SUSPENDED", "REJECTED"] as const;

export const createLicenseSchema = z.object({
  seasonId: z.number().int().positive().optional().nullable(),
  holderType: z.enum(["PLAYER", "STAFF"]),
  playerId: z.string().optional().nullable(),
  staffId: z.number().int().positive().optional().nullable(),
  licenseNumber: z.string().max(50).optional().nullable(),
  licenseType: z.enum(LICENSE_TYPES).default("PLAYER"),
  status: z.enum(LICENSE_STATUSES).default("PENDING"),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  documentUrl: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const updateLicenseSchema = createLicenseSchema.omit({ holderType: true, playerId: true, staffId: true }).partial();

export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;
export type UpdateLicenseInput = z.infer<typeof updateLicenseSchema>;
