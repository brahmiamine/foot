import { z } from "zod";
import { AGE_CATEGORIES, type AgeCategory } from "./categories";

export const recruitmentNeedSchema = z.object({
  category: z.string().min(1, "La catégorie est requise").max(20),
  position: z.string().min(1, "Le poste est requis").max(50),
  descriptionFr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

const publicHttpUrl = z
  .string()
  .trim()
  .url("URL vidéo invalide")
  .max(255)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "URL vidéo non autorisée");

/** Formulaire public de candidature (/recrutement). */
export const createRecruitmentApplicationSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(150),
  birthDate: z.string().min(1, "La date de naissance est requise"),
  category: z.string().min(1, "La catégorie est requise").max(20),
  position: z.string().min(1, "Le poste est requis").max(50),
  currentClub: z.string().max(150).optional().nullable(),
  parentPhone: z.string().min(1, "Le téléphone est requis").max(30),
  email: z.string().email("Email invalide").max(190).optional().nullable().or(z.literal("")),
  videoUrl: z.union([publicHttpUrl, z.literal("")]).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

const optionalNotes = z.string().trim().max(2000).optional().nullable();

export const recruitmentReviewSchema = z.object({ notes: optionalNotes });

export const recruitmentTrialSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }),
  location: z.string().trim().min(1, "Lieu de l'essai obligatoire").max(191),
  notes: optionalNotes,
});

export const recruitmentRejectionSchema = z.object({
  reason: z.string().trim().min(1, "Motif de refus obligatoire").max(2000),
});

export function normalizeRecruitmentCategory(value: string): AgeCategory | null {
  const normalized = value.trim().toLowerCase();
  return AGE_CATEGORIES.includes(normalized as AgeCategory) ? (normalized as AgeCategory) : null;
}

export type RecruitmentNeedInput = z.infer<typeof recruitmentNeedSchema>;
export type CreateRecruitmentApplicationInput = z.infer<typeof createRecruitmentApplicationSchema>;
export type RecruitmentTrialInput = z.infer<typeof recruitmentTrialSchema>;
