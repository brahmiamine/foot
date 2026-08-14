import { z } from "zod";

export const recruitmentNeedSchema = z.object({
  category: z.string().min(1, "La catégorie est requise").max(20),
  position: z.string().min(1, "Le poste est requis").max(50),
  descriptionFr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

/** Formulaire public de candidature (/recrutement). */
export const createRecruitmentApplicationSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(150),
  birthDate: z.string().min(1, "La date de naissance est requise"),
  category: z.string().min(1, "La catégorie est requise").max(20),
  position: z.string().min(1, "Le poste est requis").max(50),
  currentClub: z.string().max(150).optional().nullable(),
  parentPhone: z.string().min(1, "Le téléphone est requis").max(30),
  email: z.string().email("Email invalide").max(190).optional().nullable().or(z.literal("")),
  videoUrl: z.string().max(255).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

export type RecruitmentNeedInput = z.infer<typeof recruitmentNeedSchema>;
export type CreateRecruitmentApplicationInput = z.infer<typeof createRecruitmentApplicationSchema>;
