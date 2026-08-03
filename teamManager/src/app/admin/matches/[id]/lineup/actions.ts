"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { MatchLineupService } from "@/services/MatchLineupService";
import { AuditLogService } from "@/services/AuditLogService";
import { saveLineupSchema } from "@/types/lineups";

/** Enregistre la composition (titulaires/remplaçants) d'un match — réservé ADMIN. */
export async function saveLineup(matchId: string, entriesJson: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const entries = JSON.parse(entriesJson);
    const data = saveLineupSchema.parse({ matchId, entries });

    const teamId = await requireTeamId();
    const lineupService = new MatchLineupService();
    const saved = await lineupService.saveLineup(data.matchId, teamId, data.entries);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "MatchLineup",
      entityId: matchId,
      after: { matchId, count: saved.length },
    });

    revalidatePath(`/admin/matches/${matchId}/lineup`);
    return { success: true, message: "Composition enregistrée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}
