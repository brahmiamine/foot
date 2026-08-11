import { z } from "zod";

export const contactInfoSchema = z.object({
  addressFr: z.string().max(255).optional().nullable(),
  addressAr: z.string().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("Email invalide").max(190).optional().nullable().or(z.literal("")),
  openingHoursFr: z.string().max(255).optional().nullable(),
  openingHoursAr: z.string().max(255).optional().nullable(),
  mapEmbedUrl: z.string().max(500).optional().nullable(),
  adminPhone: z.string().max(30).optional().nullable(),
  adminEmail: z.string().max(190).optional().nullable(),
  sportPhone: z.string().max(30).optional().nullable(),
  sportEmail: z.string().max(190).optional().nullable(),
  academyPhone: z.string().max(30).optional().nullable(),
  academyEmail: z.string().max(190).optional().nullable(),
  partnershipPhone: z.string().max(30).optional().nullable(),
  partnershipEmail: z.string().max(190).optional().nullable(),
});

/** Formulaire public de contact (/contact). */
export const createContactMessageSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(150),
  email: z.string().email("Email invalide").max(190),
  subject: z.string().min(1, "Le sujet est requis").max(200),
  department: z.enum(["GENERAL", "ADMINISTRATIF", "SPORTIF", "ACADEMIE", "PARTENARIAT"]).default("GENERAL"),
  message: z.string().min(1, "Le message est requis").max(3000),
});

export type ContactInfoInput = z.infer<typeof contactInfoSchema>;
export type CreateContactMessageInput = z.infer<typeof createContactMessageSchema>;
