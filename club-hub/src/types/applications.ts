import { z } from "zod";
import { AGE_CATEGORIES } from "@/types/categories";

/** Formulaire public "Inscrire mon enfant" (/inscription). */
export const createPlayerApplicationSchema = z.object({
  childLastName: z.string().min(1, "Le nom de l'enfant est requis").max(100),
  childFirstName: z.string().min(1, "Le prénom de l'enfant est requis").max(100),
  birthDate: z.string().min(1, "La date de naissance est requise"),
  category: z.string().min(1, "La catégorie est requise").max(20),
  position: z.string().max(50).optional().nullable(),
  parentName: z.string().min(1, "Le nom du parent est requis").max(150),
  parentPhone: z.string().min(1, "Le téléphone est requis").max(30),
  parentEmail: z.string().email("Email invalide").max(190),
  message: z.string().max(2000).optional().nullable(),
  documentUrl: z.string().optional().nullable(),
});

/** Conservé pour le workflow recrutement historique, encore séparé de CLUB-006. */
export const applicationStatusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "TRIAL", "ACCEPTED", "REJECTED"]),
  adminNotes: z.string().max(2000).optional().nullable(),
});

const optionalNotes = z.string().trim().max(2000).optional().nullable();

export const academyPreScreenSchema = z.object({
  notes: optionalNotes,
});

export const academyTrialSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }),
  location: z.string().trim().min(1, "Lieu de l'essai obligatoire").max(191),
  notes: optionalNotes,
});

export const academyApprovalSchema = z.object({
  notes: optionalNotes,
});

export const academyRejectionSchema = z.object({
  reason: z.string().trim().min(1, "Motif de refus obligatoire").max(2000),
});

export const academyCreatePlayerSchema = z.object({
  number: z.coerce.number().int().min(0).max(999),
  category: z.enum(AGE_CATEGORIES),
  position: z.string().trim().max(50).optional().nullable(),
});

export type CreatePlayerApplicationInput = z.infer<typeof createPlayerApplicationSchema>;
export type ApplicationStatusInput = z.infer<typeof applicationStatusSchema>;
export type AcademyTrialInput = z.infer<typeof academyTrialSchema>;
export type AcademyCreatePlayerInput = z.infer<typeof academyCreatePlayerSchema>;
