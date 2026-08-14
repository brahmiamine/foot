"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission, requireCategory } from "@/lib/access";
import { MatchLineupService } from "@/services/MatchLineupService";
import { MatchFormationService, MatchRef } from "@/services/MatchFormationService";
import { ConvocationService } from "@/services/ConvocationService";
import { FriendlyMatchService } from "@/services/FriendlyMatchService";
import { TeamService } from "@/services/TeamService";
import { AuditLogService } from "@/services/AuditLogService";
import { saveLineupSchema } from "@/types/lineups";

/**
 * Server actions partagées entre la composition d'un match officiel
 * (/admin/matches/[id]/lineup) et d'un match amical
 * (/admin/friendly-matches/[id]/lineup) — même éditeur (PitchLineupEditor),
 * même logique de permission/catégorie/verrouillage.
 */

async function checkCategoryForRef(teamId: string, ref: MatchRef, access: Awaited<ReturnType<typeof getUserAccess>>) {
  if (ref.matchType === "FRIENDLY" && ref.friendlyMatchId) {
    const friendlyMatchService = new FriendlyMatchService();
    const friendly = await friendlyMatchService.findById(ref.friendlyMatchId, teamId);
    if (!friendly) throw new Error("Match amical non trouvé");
    requireCategory(access, friendly.category);
  } else {
    const teamService = new TeamService();
    const team = await teamService.findById(teamId);
    if (team) requireCategory(access, team.ageCategory);
  }
}

function buildRoutePath(ref: MatchRef): string {
  return ref.matchType === "OFFICIAL" ? `/admin/matches/${ref.matchId}/lineup` : `/admin/friendly-matches/${ref.friendlyMatchId}/lineup`;
}

export async function saveMatchLineup(ref: MatchRef, entriesJson: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "lineups.edit");
    await checkCategoryForRef(teamId, ref, access);

    const entries = JSON.parse(entriesJson);
    const data = saveLineupSchema.parse({ ...ref, entries });

    const lineupService = new MatchLineupService();
    const saved = await lineupService.saveLineup(teamId, ref, data.entries);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "MatchLineup",
      entityId: String(ref.matchId ?? ref.friendlyMatchId),
      after: { count: saved.length },
    });

    revalidatePath(buildRoutePath(ref));
    return { success: true as const, messageKey: "lineup.feedback.saved" as const };
  } catch {
    return { success: false as const, errorKey: "lineup.errors.save" as const };
  }
}

export async function setMatchFormation(ref: MatchRef, formationCode: string) {
  try {
    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "lineups.edit");
    await checkCategoryForRef(teamId, ref, access);

    const formationService = new MatchFormationService();
    if (await formationService.isEffectivelyLocked(teamId, ref)) {
      throw new Error("Ce match est terminé : la formation ne peut plus être modifiée");
    }
    await formationService.setFormation(teamId, ref, formationCode);

    revalidatePath(buildRoutePath(ref));
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" };
  }
}

export async function sendMatchConvocations(ref: MatchRef) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "convocations.send");
    await checkCategoryForRef(teamId, ref, access);

    const convocationService = new ConvocationService();
    const sent = await convocationService.sendFromLineup(teamId, ref);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "Convocation",
      entityId: String(ref.matchId ?? ref.friendlyMatchId),
      after: { count: sent.length },
    });

    revalidatePath(buildRoutePath(ref));
    revalidatePath("/admin/convocations");
    return {
      success: true as const,
      messageKey: sent.length > 0 ? "lineup.feedback.callupsSent" as const : "lineup.feedback.noCallups" as const,
      values: { count: sent.length },
    };
  } catch {
    return { success: false as const, errorKey: "lineup.errors.callups" as const };
  }
}
