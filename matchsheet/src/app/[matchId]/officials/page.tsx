import { notFound } from "next/navigation";
import { MatchService } from "@/services/MatchService";
import { SheetService } from "@/services/SheetService";
import { MatchOfficialService } from "@/services/MatchOfficialService";
import { OfficialsForm } from "./OfficialsForm";
import { serverTranslate } from "@/lib/i18n/server";

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
  const [homeTeamFallback, awayTeamFallback] = await Promise.all([
    serverTranslate("teams.home"),
    serverTranslate("teams.away"),
  ]);

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
      homeTeamName={match.homeTeam?.nom ?? homeTeamFallback}
      awayTeamName={match.awayTeam?.nom ?? awayTeamFallback}
      officials={officialsData}
    />
  );
}
