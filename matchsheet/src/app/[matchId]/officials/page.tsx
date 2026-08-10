import { notFound } from "next/navigation";
import { MatchService } from "@/services/MatchService";
import { SheetService } from "@/services/SheetService";
import { MatchOfficialService } from "@/services/MatchOfficialService";
import { OfficialsForm } from "./OfficialsForm";

export const dynamic = "force-dynamic";

export default async function OfficialsPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  const matchService = new MatchService();
  const sheetService = new SheetService();
  const officialService = new MatchOfficialService();

  const match = await matchService.findById(matchId);
  if (!match) {
    notFound();
  }

  const sheet = await sheetService.getOrCreate(matchId);
  const officials = await officialService.findBySheet(sheet.id);

  const officialsData = officials.map((o) => ({
    role: o.role,
    fullName: o.fullName ?? null,
    licenseNumber: o.licenseNumber ?? null,
    confirmed: o.confirmed,
  }));

  return (
    <OfficialsForm
      matchId={matchId}
      sheetId={sheet.id}
      homeTeamName={match.homeTeam?.nom ?? "Équipe domicile"}
      awayTeamName={match.awayTeam?.nom ?? "Équipe extérieure"}
      officials={officialsData}
    />
  );
}
