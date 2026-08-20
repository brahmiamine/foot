"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { PlayerStatService } from "@/services/PlayerStatService";
import { PlayerService } from "@/services/PlayerService";
import { createPlayerStatSchema, csvPlayerStatRowSchema, type CsvPlayerStatRow } from "@/types/player-stats";
import { csvToObjects } from "@/lib/csv";

export async function createPlayerStats(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "stats.manage");

    const data = createPlayerStatSchema.parse({
      playerIds: formData.getAll("playerIds") as string[],
      season: (formData.get("season") as string) || null,
      minutesPlayed: parseInt((formData.get("minutesPlayed") as string) || "0", 10),
      goals: parseInt((formData.get("goals") as string) || "0", 10),
      assists: parseInt((formData.get("assists") as string) || "0", 10),
      yellowCards: parseInt((formData.get("yellowCards") as string) || "0", 10),
      redCards: parseInt((formData.get("redCards") as string) || "0", 10),
      injuriesCount: parseInt((formData.get("injuriesCount") as string) || "0", 10),
      trainingsAttended: parseInt((formData.get("trainingsAttended") as string) || "0", 10),
      trainingsTotal: parseInt((formData.get("trainingsTotal") as string) || "0", 10),
      notes: (formData.get("notes") as string) || null,
    });

    const teamId = await requireTeamId();
    const playerService = new PlayerService();
    for (const playerId of data.playerIds) {
      const player = await playerService.findById(playerId, teamId);
      if (!player) throw new Error("Joueur non trouvé");
      // Le scoping catégorie est déjà appliqué à la liste de joueurs proposée côté page ; on
      // revalide ici que chaque joueur appartient bien au périmètre de l'utilisateur.
      if (access.categories !== "ALL" && !access.categories.includes(player.category)) {
        throw new Error("Action non autorisée : catégorie hors de votre périmètre");
      }
    }

    const service = new PlayerStatService();
    await service.createForPlayers(data, teamId, session.user.id);

    revalidatePath("/admin/player-stats");
    return { success: true, message: `Statistiques enregistrées pour ${data.playerIds.length} joueur(s)` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

export async function importPlayerStatsCsv(csvText: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "stats.manage");
    if (access.categories !== "ALL") {
      throw new Error("L'import CSV est réservé aux profils ayant accès à toutes les catégories");
    }

    const objects = csvToObjects(csvText);
    if (objects.length === 0) {
      throw new Error("Fichier CSV vide ou invalide");
    }
    if (objects.length > 500) {
      throw new Error("Maximum 500 lignes par import");
    }

    const rows: CsvPlayerStatRow[] = [];
    const parseErrors: string[] = [];
    objects.forEach((obj, index) => {
      const result = csvPlayerStatRowSchema.safeParse(obj);
      if (result.success) {
        rows.push(result.data);
      } else {
        parseErrors.push(`Ligne ${index + 2} : ${result.error.issues.map((i) => i.message).join(", ")}`);
      }
    });

    if (rows.length === 0) {
      throw new Error(`Aucune ligne valide. ${parseErrors.slice(0, 3).join(" | ")}`);
    }

    const teamId = await requireTeamId();
    const service = new PlayerStatService();
    const result = await service.importRows(rows, teamId, session.user.id);

    revalidatePath("/admin/player-stats");
    return {
      success: true,
      message: `${result.imported} ligne(s) importée(s)${result.skipped.length > 0 ? `, ${result.skipped.length} ignorée(s)` : ""}`,
      skipped: result.skipped,
      parseErrors,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'import" };
  }
}

export async function deletePlayerStat(id: number, reason?: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "stats.manage");

    const teamId = await requireTeamId();
    const service = new PlayerStatService();
    await service.delete(id, teamId, {
      actorUserId: session.user.id,
      actorRole: access.actorRole ?? (access.isClubAdmin ? "ADMIN" : "STAFF"),
      reason,
    });

    revalidatePath("/admin/player-stats");
    return { success: true, message: "Entrée supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
