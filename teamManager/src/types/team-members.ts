import { z } from "zod";

/**
 * Team member status enum
 */
export const TEAM_MEMBER_STATUSES = ["ACTIVE", "SUSPENDED", "ENDED"] as const;

/**
 * Validation schema for creating a team member
 * Must have either playerId OR staffId (not both, not neither)
 */
export const createTeamMemberSchema = z
  .object({
    playerId: z.string().min(1).optional().nullable(),
    staffId: z.number().int().positive().optional().nullable(),
    seasonId: z.number().int().positive().optional().nullable(),
    internalTeamId: z.number().int().positive().optional().nullable(),
    status: z.enum(TEAM_MEMBER_STATUSES).default("ACTIVE"),
    startDate: z.date({ error: "La date de début est requise" }),
    endDate: z.date().optional().nullable(),
  })
  .refine(
    (data) => {
      // Exactly one of playerId or staffId must be provided
      const hasPlayer = data.playerId !== null && data.playerId !== undefined;
      const hasStaff = data.staffId !== null && data.staffId !== undefined;
      return (hasPlayer && !hasStaff) || (!hasPlayer && hasStaff);
    },
    {
      message: "Vous devez spécifier soit un joueur, soit un membre du staff (pas les deux, pas aucun)",
    }
  );

/**
 * Validation schema for updating a team member
 */
export const updateTeamMemberSchema = z.object({
  seasonId: z.number().int().positive().optional().nullable(),
  internalTeamId: z.number().int().positive().optional().nullable(),
  status: z.enum(TEAM_MEMBER_STATUSES).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional().nullable(),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

