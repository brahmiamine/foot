import { z } from "zod";

export const clubInfoSchema = z.object({
  presentationFr: z.string().optional().nullable(),
  presentationAr: z.string().optional().nullable(),
  valuesFr: z.string().optional().nullable(),
  valuesAr: z.string().optional().nullable(),
  sportProjectFr: z.string().optional().nullable(),
  sportProjectAr: z.string().optional().nullable(),
  organizationFr: z.string().optional().nullable(),
  organizationAr: z.string().optional().nullable(),
});

export const historySchema = z.object({
  foundedDate: z.string().optional().nullable(),
  storyFr: z.string().optional().nullable(),
  storyAr: z.string().optional().nullable(),
});

export const historyFigureSchema = z.object({
  category: z.enum(["PRESIDENT", "COACH", "PLAYER", "TEAM"]),
  nameFr: z.string().min(1, "Le nom est requis").max(200),
  nameAr: z.string().max(200).optional().nullable(),
  periodFr: z.string().max(100).optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  displayOrder: z.number().int().default(0),
});

export const honorSchema = z.object({
  competitionFr: z.string().min(1, "La compétition est requise").max(150),
  competitionAr: z.string().max(150).optional().nullable(),
  titleCount: z.number().int().min(0).default(0),
  yearsFr: z.string().max(255).optional().nullable(),
  icon: z.string().max(10).optional().nullable(),
  displayOrder: z.number().int().default(0),
});

export type ClubInfoInput = z.infer<typeof clubInfoSchema>;
export type HistoryInput = z.infer<typeof historySchema>;
export type HistoryFigureInput = z.infer<typeof historyFigureSchema>;
export type HonorInput = z.infer<typeof honorSchema>;
