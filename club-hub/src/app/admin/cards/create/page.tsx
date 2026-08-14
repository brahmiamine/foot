import { requireTeamId } from "@/lib/team-context";
import { PlayerService } from "@/services/PlayerService";
import { MatchService } from "@/services/MatchService";
import { CardReasonService } from "@/services/CardReasonService";
import { CardForm } from "../CardForm";

export const dynamic = "force-dynamic";

export default async function CreateCardPage() {
  const teamId = await requireTeamId();
  const playerService = new PlayerService();
  const matchService = new MatchService();
  const cardReasonService = new CardReasonService();

  const [players, matches, cardReasons] = await Promise.all([
    playerService.findAll(teamId),
    matchService.findAll(teamId),
    cardReasonService.findActive(),
  ]);

  return (
    <CardForm
      players={players.map((p) => ({ id: p.id, label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}` }))}
      matches={matches.map((m) => ({
        id: m.id,
        label: `J${m.matchday?.number ?? "?"} — ${m.homeTeam?.nom ?? ""} vs ${m.awayTeam?.nom ?? ""}`,
      }))}
      cardReasons={cardReasons.map((r) => ({ id: r.id, label: r.labelFr, type: r.type }))}
    />
  );
}
