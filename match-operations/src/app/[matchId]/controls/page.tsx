import { notFound } from "next/navigation";
import { MatchService } from "@/services/MatchService";
import { SheetService } from "@/services/SheetService";
import { LineupService } from "@/services/LineupService";
import { PlayerControlService } from "@/services/PlayerControlService";
import { ControlsChecklist } from "./ControlsChecklist";

export const dynamic = "force-dynamic";

export default async function ControlsPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  const matchService = new MatchService();
  const sheetService = new SheetService();
  const lineupService = new LineupService();
  const controlService = new PlayerControlService();

  const match = await matchService.findById(matchId);
  if (!match) {
    notFound();
  }

  const sheet = await sheetService.getOrCreate(matchId);
  const [lineup, controls] = await Promise.all([lineupService.findByMatch(matchId), controlService.findBySheet(sheet.id)]);

  const toEntry = (l: (typeof lineup)[number]) => {
    const control = controls.find((c) => c.matchLineupId === l.id);
    return {
      matchLineupId: l.id,
      name: `${l.player?.firstNameFr ?? ""} ${l.player?.lastNameFr ?? ""}`.trim() || "Joueur inconnu",
      nameAr: l.player?.firstNameAr && l.player?.lastNameAr ? `${l.player.firstNameAr} ${l.player.lastNameAr}` : null,
      shirtNumber: l.shirtNumber ?? null,
      role: l.role,
      isCaptain: l.isCaptain,
      checked: control?.checked ?? false,
      note: control?.note ?? "",
    };
  };

  const homeEntries = lineup.filter((l) => l.teamId === match.equipeHome).map(toEntry);
  const awayEntries = lineup.filter((l) => l.teamId === match.equipeAway).map(toEntry);

  return (
    <ControlsChecklist
      matchId={matchId}
      sheetId={sheet.id}
      homeTeamName={match.homeTeam?.nom ?? "Équipe domicile"}
      awayTeamName={match.awayTeam?.nom ?? "Équipe extérieure"}
      homeEntries={homeEntries}
      awayEntries={awayEntries}
    />
  );
}
