import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  contentHtml: z.string().min(1, "Le contenu est requis"),
  category: z.enum(["DECISION", "PROGRAMME", "ADMINISTRATIF", "RECRUTEMENT", "SANCTION", "ANNONCE"]),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
