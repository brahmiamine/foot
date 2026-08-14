import { z } from "zod";

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

export const applicationStatusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "TRIAL", "ACCEPTED", "REJECTED"]),
  adminNotes: z.string().max(2000).optional().nullable(),
});

export type CreatePlayerApplicationInput = z.infer<typeof createPlayerApplicationSchema>;
export type ApplicationStatusInput = z.infer<typeof applicationStatusSchema>;
