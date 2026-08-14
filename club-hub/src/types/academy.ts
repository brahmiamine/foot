import { z } from "zod";

export const academyCategorySchema = z.object({
  code: z.string().min(1, "Le code est requis").max(10),
  nameFr: z.string().min(1, "Le nom est requis").max(100),
  nameAr: z.string().max(100).optional().nullable(),
  ageRangeFr: z.string().max(50).optional().nullable(),
  descriptionFr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

export const academyInfoSchema = z.object({
  philosophyFr: z.string().optional().nullable(),
  philosophyAr: z.string().optional().nullable(),
  methodFr: z.string().optional().nullable(),
  methodAr: z.string().optional().nullable(),
  supervisionFr: z.string().optional().nullable(),
  supervisionAr: z.string().optional().nullable(),
  infrastructureFr: z.string().optional().nullable(),
  infrastructureAr: z.string().optional().nullable(),
  detectionFr: z.string().optional().nullable(),
  detectionAr: z.string().optional().nullable(),
});

export type AcademyCategoryInput = z.infer<typeof academyCategorySchema>;
export type AcademyInfoInput = z.infer<typeof academyInfoSchema>;
