import { z } from "zod";

const urlOrPathSchema = z
  .union([z.string().url(), z.string().regex(/^\/(?!\/).+/, "Le chemin public doit commencer par /"), z.literal("")])
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value));

const contractDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de contrat invalide");
const moneySchema = z.coerce.number().finite().nonnegative().max(999_999_999.999);

/** Formulaire public de demande de partenariat. */
export const createSponsorRequestSchema = z.object({
  companyName: z.string().trim().min(1, "Le nom de l'entreprise est requis").max(200),
  contactName: z.string().trim().min(1, "Le nom du contact est requis").max(150),
  email: z.string().trim().email("Email invalide").max(190),
  phone: z.string().trim().max(30).optional().nullable(),
  website: z.string().trim().max(255).optional().nullable(),
  logoUrl: urlOrPathSchema,
  logoSize: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional().nullable(),
  proposedLevel: z.enum(["OR", "ARGENT", "BRONZE", "LOCAL"]).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
});

/** Note interne de revue/négociation/validation. */
export const sponsorWorkflowNoteSchema = z.object({
  notes: z.string().trim().max(2000).optional().nullable(),
});

/** Contrat sponsor complet : aucune activation ne peut être dérivée d'un formulaire partiel. */
export const sponsorContractDraftSchema = z
  .object({
    level: z.enum(["OR", "ARGENT", "BRONZE", "LOCAL"]),
    logoSize: z.enum(["SMALL", "MEDIUM", "LARGE"]).default("MEDIUM"),
    logoPlacement: z.array(z.enum(["HOME", "FOOTER", "MATCH_PAGES", "SHOP"])).max(4).default([]),
    contractStart: contractDateSchema,
    contractEnd: contractDateSchema,
    contractAmount: moneySchema,
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const start = Date.parse(`${value.contractStart}T00:00:00.000Z`);
    const end = Date.parse(`${value.contractEnd}T00:00:00.000Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contractEnd"],
        message: "La fin du contrat doit être postérieure au début",
      });
    }
  });

export const sponsorRejectionSchema = z.object({
  reason: z.string().trim().min(3, "Un motif d'au moins 3 caractères est obligatoire").max(2000),
});

export const sponsorshipGovernanceSchema = z.object({
  dualApprovalThreshold: moneySchema,
});

export type CreateSponsorRequestInput = z.infer<typeof createSponsorRequestSchema>;
export type SponsorWorkflowNoteInput = z.infer<typeof sponsorWorkflowNoteSchema>;
export type SponsorContractDraftInput = z.infer<typeof sponsorContractDraftSchema>;
export type SponsorRejectionInput = z.infer<typeof sponsorRejectionSchema>;
export type SponsorshipGovernanceInput = z.infer<typeof sponsorshipGovernanceSchema>;
