import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { PlayerStatService } from "@/services/PlayerStatService";
import { PlayerService } from "@/services/PlayerService";
import { PlayerStatsManagement } from "./PlayerStatsManagement";

export const dynamic = "force-dynamic";

/** Page Statistiques joueurs — saisie manuelle (un ou plusieurs joueurs) + import CSV. */
export default async function PlayerStatsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();

  const statService = new PlayerStatService();
  const playerService = new PlayerService();

  const [totals, entriesData, playersData] = await Promise.all([
    statService.getTotalsByPlayer(teamId, access.categories),
    statService.findAll(teamId),
    playerService.findAll(teamId, access.categories),
  ]);

  const playersById = new Map(playersData.map((p) => [p.id, p]));

  const rows = totals
    .map((t) => {
      const player = playersById.get(t.playerId);
      return player
        ? {
            ...t,
            playerLabel: `#${player.number} ${player.firstNameFr} ${player.lastNameFr}`,
            category: player.category,
          }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.playerLabel.localeCompare(b.playerLabel));

  const entries = entriesData
    .filter((e) => playersById.has(e.playerId))
    .map((e) => ({
      id: e.id,
      playerLabel: e.player ? `#${e.player.number} ${e.player.firstNameFr} ${e.player.lastNameFr}` : "Joueur inconnu",
      season: e.season ?? null,
      minutesPlayed: e.minutesPlayed,
      goals: e.goals,
      assists: e.assists,
      yellowCards: e.yellowCards,
      redCards: e.redCards,
      injuriesCount: e.injuriesCount,
      trainingsAttended: e.trainingsAttended,
      trainingsTotal: e.trainingsTotal,
      notes: e.notes ?? null,
      createdAt: e.createdAt.toISOString(),
    }));

  const players = playersData.map((p) => ({ id: p.id, label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}` }));

  return (
    <PlayerStatsManagement
      totals={rows}
      entries={entries}
      players={players}
      canManage={can(access, "stats.manage")}
      canImportCsv={can(access, "stats.manage") && access.categories === "ALL"}
    />
  );
}
