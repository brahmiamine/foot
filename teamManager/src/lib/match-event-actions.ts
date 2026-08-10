"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission, requireCategory } from "@/lib/access";
import { MatchEventService } from "@/services/MatchEventService";
import { FriendlyMatchService } from "@/services/FriendlyMatchService";
import { MatchService } from "@/services/MatchService";
import { PlayerService } from "@/services/PlayerService";
import { createMatchEventSchema } from "@/types/match-events";
import type { MatchRef } from "@/services/MatchFormationService";

/**
 * Server actions partagées entre le journal d'événements d'un match
 * officiel (/admin/match-events/official/[id]) et d'un match amical
 * (/admin/match-events/friendly/[id]) — même composant client
 * (MatchEventsManagement), même logique de permission/catégorie.
 */

async function checkCategoryForRef(teamId: string, ref: MatchRef, access: Awaited<ReturnType<typeof getUserAccess>>) {
  if (ref.matchType === "FRIENDLY" && ref.friendlyMatchId) {
    const friendlyMatchService = new FriendlyMatchService();
    const friendly = await friendlyMatchService.findById(ref.friendlyMatchId, teamId);
    if (!friendly) throw new Error("Match amical non trouvé");
    requireCategory(access, friendly.category);
  }
  // Un match officiel n'est pas rattaché à une catégorie précise côté teamManager.
}

function buildRoutePath(ref: MatchRef): string {
  return ref.matchType === "OFFICIAL" ? `/admin/match-events/official/${ref.matchId}` : `/admin/match-events/friendly/${ref.friendlyMatchId}`;
}

export async function createMatchEvent(ref: MatchRef, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "competitions.manage");
    await checkCategoryForRef(teamId, ref, access);

    if (ref.matchType === "OFFICIAL" && ref.matchId) {
      const matchService = new MatchService();
      const match = await matchService.findById(ref.matchId, teamId);
      if (!match) throw new Error("Match officiel non trouvé");
    }

    const playerId = (formData.get("playerId") as string) || null;
    if (playerId) {
      const playerService = new PlayerService();
      const player = await playerService.findById(playerId, teamId);
      if (!player) throw new Error("Joueur non trouvé");
    }

    const data = createMatchEventSchema.parse({
      matchType: ref.matchType,
      matchId: ref.matchType === "OFFICIAL" ? ref.matchId : null,
      friendlyMatchId: ref.matchType === "FRIENDLY" ? ref.friendlyMatchId : null,
      eventType: formData.get("eventType") as string,
      teamSide: formData.get("teamSide") as string,
      playerId,
      minute: formData.get("minute") ? parseInt(formData.get("minute") as string, 10) : null,
      notes: (formData.get("notes") as string) || null,
    });

    const service = new MatchEventService();
    await service.create(data, teamId, session.user.id);

    revalidatePath(buildRoutePath(ref));
    return { success: true, message: "Événement enregistré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

export async function deleteMatchEvent(ref: MatchRef, id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "competitions.manage");
    await checkCategoryForRef(teamId, ref, access);

    const service = new MatchEventService();
    await service.delete(id, teamId);

    revalidatePath(buildRoutePath(ref));
    return { success: true, message: "Événement supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
