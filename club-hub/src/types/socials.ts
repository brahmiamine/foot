import { z } from "zod";

const urlSchema = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .nullable()
  .transform((val) => (val === "" ? null : val));

export const teamSocialsSchema = z.object({
  facebookUrl: urlSchema,
  instagramUrl: urlSchema,
  tiktokUrl: urlSchema,
  youtubeUrl: urlSchema,
  xUrl: urlSchema,
});

export type TeamSocialsInput = z.infer<typeof teamSocialsSchema>;
