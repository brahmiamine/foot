import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format #RRGGBB attendu)");

export const updateBrandingSchema = z.object({
  displayName: z.string().max(150).optional().nullable(),
  shortName: z.string().max(30).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  logoDarkUrl: z.string().max(500).optional().nullable(),
  faviconUrl: z.string().max(500).optional().nullable(),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
});

export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
