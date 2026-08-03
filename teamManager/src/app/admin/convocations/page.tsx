import { requireTeamId } from "@/lib/team-context";
import { ConvocationService } from "@/services/ConvocationService";
import { PlayerService } from "@/services/PlayerService";
import { MatchService } from "@/services/MatchService";
import { ConvocationsManagement } from "./ConvocationsManagement";

export const dynamic = "force-dynamic";

/** Page Convocations — sélection des joueurs convoqués par match et suivi de leur présence. */
export default async function ConvocationsPage() {
  const teamId = await requireTeamId();
  const convocationService = new ConvocationService();
  const playerService = new PlayerService();
  const matchService = new MatchService();

  const [convocationsData, playersData, matchesData] = await Promise.all([
    convocationService.findAll(teamId),
    playerService.findAll(teamId),
    matchService.findAll(teamId),
  ]);

  const matchLabels = new Map(
    matchesData.map((m) => [m.id, `J${m.matchday?.number ?? "?"} — ${m.homeTeam?.nom ?? ""} vs ${m.awayTeam?.nom ?? ""}`])
  );
  const matchDates = new Map(matchesData.map((m) => [m.id, m.date ? m.date.toISOString() : null]));

  const convocations = convocationsData.map((c) => ({
    id: c.id,
    response: c.response,
    notes: c.notes ?? null,
    createdAt: c.createdAt.toISOString(),
    matchId: c.matchId,
    matchLabel: matchLabels.get(c.matchId) ?? `${c.match?.homeTeam?.nom ?? ""} vs ${c.match?.awayTeam?.nom ?? ""}`,
    matchDate: matchDates.get(c.matchId) ?? (c.match?.date ? c.match.date.toISOString() : null),
    playerId: c.playerId,
    playerLabel: c.player ? `#${c.player.number} ${c.player.firstNameFr} ${c.player.lastNameFr}` : "Joueur inconnu",
  }));

  const players = playersData
    .filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}`,
    }));

  const matches = matchesData.map((m) => ({
    id: m.id,
    label: matchLabels.get(m.id) ?? "",
  }));

  return <ConvocationsManagement initialConvocations={convocations} players={players} matches={matches} />;
}
