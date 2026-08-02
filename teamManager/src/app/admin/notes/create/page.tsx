import { requireTeamId } from "@/lib/team-context";
import { PlayerService } from "@/services/PlayerService";
import { MatchService } from "@/services/MatchService";
import { NoteForm } from "../NoteForm";

export const dynamic = "force-dynamic";

export default async function CreateNotePage() {
  const teamId = await requireTeamId();
  const playerService = new PlayerService();
  const matchService = new MatchService();

  const [players, matches] = await Promise.all([playerService.findAll(teamId), matchService.findAll(teamId)]);

  return (
    <NoteForm
      players={players.map((p) => ({ id: p.id, label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}` }))}
      matches={matches.map((m) => ({
        id: m.id,
        label: `J${m.matchday?.number ?? "?"} — ${m.homeTeam?.nom ?? ""} vs ${m.awayTeam?.nom ?? ""}`,
      }))}
    />
  );
}
