import { z } from "zod";

export const DOCUMENT_ENTITY_TYPES = ["PLAYER", "STAFF", "LICENSE", "INJURY", "GUARDIAN", "TEAM", "OTHER"] as const;
export const DOCUMENT_CATEGORIES = ["IDENTITY", "MEDICAL", "LICENSE", "INSURANCE", "PARENTAL_CONSENT", "CONTRACT", "OTHER"] as const;

export const DOCUMENT_CATEGORY_LABELS: Record<(typeof DOCUMENT_CATEGORIES)[number], string> = {
  IDENTITY: "Identité",
  MEDICAL: "Médical",
  LICENSE: "Licence",
  INSURANCE: "Assurance",
  PARENTAL_CONSENT: "Autorisation parentale",
  CONTRACT: "Contrat",
  OTHER: "Autre",
};

export const createDocumentSchema = z.object({
  entityType: z.enum(DOCUMENT_ENTITY_TYPES),
  entityId: z.string().min(1, "Entité requise"),
  category: z.enum(DOCUMENT_CATEGORIES).default("OTHER"),
  title: z.string().min(1, "Le titre est requis").max(200),
  fileUrl: z.string().min(1, "Le fichier est requis").max(500),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
