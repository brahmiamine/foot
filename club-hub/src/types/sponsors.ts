import { z } from "zod";

const urlOrPathSchema = z
  .union([z.string().url(), z.string().regex(/^\/[^/].*/, "Le chemin doit commencer par /"), z.literal("")])
  .optional()
  .nullable()
  .transform((val) => (val === "" ? null : val));

/**
 * Formulaire public de demande de partenariat (rempli par l'entreprise).
 */
export const createSponsorRequestSchema = z.object({
  companyName: z.string().min(1, "Le nom de l'entreprise est requis").max(200),
  contactName: z.string().min(1, "Le nom du contact est requis").max(150),
  email: z.string().email("Email invalide").max(190),
  phone: z.string().max(30).optional().nullable(),
  website: z.string().max(255).optional().nullable(),
  logoUrl: urlOrPathSchema,
  logoSize: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional().nullable(),
  proposedLevel: z.enum(["OR", "ARGENT", "BRONZE", "LOCAL"]).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

/**
 * Traitement admin d'une demande : acceptation avec les termes du dossier
 * (niveau, taille/emplacement du logo, durée, montant), ou refus motivé.
 */
export const acceptSponsorRequestSchema = z.object({
  level: z.enum(["OR", "ARGENT", "BRONZE", "LOCAL"]),
  logoSize: z.enum(["SMALL", "MEDIUM", "LARGE"]).default("MEDIUM"),
  logoPlacement: z.array(z.enum(["HOME", "FOOTER", "MATCH_PAGES", "SHOP"])).default([]),
  contractStart: z.string().optional().nullable(),
  contractEnd: z.string().optional().nullable(),
  contractAmount: z.number().nonnegative().optional().nullable(),
  adminNotes: z.string().max(2000).optional().nullable(),
});

export const refuseSponsorRequestSchema = z.object({
  adminNotes: z.string().min(1, "Merci de préciser le motif du refus").max(2000),
});

export const updateSponsorSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  logoUrl: urlOrPathSchema,
  logoSize: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional(),
  website: z.string().max(255).optional().nullable(),
  level: z.enum(["OR", "ARGENT", "BRONZE", "LOCAL"]).optional(),
  logoPlacement: z.array(z.enum(["HOME", "FOOTER", "MATCH_PAGES", "SHOP"])).optional(),
  contractStart: z.string().optional().nullable(),
  contractEnd: z.string().optional().nullable(),
  contractAmount: z.number().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateSponsorRequestInput = z.infer<typeof createSponsorRequestSchema>;
export type AcceptSponsorRequestInput = z.infer<typeof acceptSponsorRequestSchema>;
export type RefuseSponsorRequestInput = z.infer<typeof refuseSponsorRequestSchema>;
export type UpdateSponsorInput = z.infer<typeof updateSponsorSchema>;
