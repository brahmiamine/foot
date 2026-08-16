import { notFound } from "next/navigation";
import { getCurrentMatchActorSession } from "@/lib/matchActorSession";
import { MatchAccessService } from "@/services/MatchAccessService";
import { MatchService } from "@/services/MatchService";
import { SheetService } from "@/services/SheetService";
import { SignatureService } from "@/services/SignatureService";
import { ReservationService } from "@/services/ReservationService";
import { PreMatchSignatures } from "./PreMatchSignatures";

export const dynamic = "force-dynamic";

export default async function PreMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  const matchService = new MatchService();
  const sheetService = new SheetService();
  const signatureService = new SignatureService();
  const reservationService = new ReservationService();

  const match = await matchService.findById(matchId);
  if (!match) {
    notFound();
  }

  const sheet = await sheetService.getOrCreate(matchId);
  const session = await getCurrentMatchActorSession();

  const [signatures, reservations, isComplete, editableActorRole] = await Promise.all([
    signatureService.findBySheet(sheet.id),
    reservationService.findBySheet(sheet.id),
    signatureService.isPhaseComplete(sheet.id, "PRE_MATCH"),
    new MatchAccessService().resolveSignatureActor(session, matchId),
  ]);

  const preMatchSignatures = signatures
    .filter((s) => s.phase === "PRE_MATCH")
    .map((s) => ({
      id: s.id,
      actorRole: s.actorRole,
      signerName: s.signerName ?? null,
      signatureData: s.signatureData,
      signedAt: s.signedAt.toISOString(),
    }));

  const preMatchReservations = reservations
    .filter((r) => r.phase === "PRE_MATCH")
    .map((r) => ({
      id: r.id,
      authorRole: r.authorRole,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }));

  return (
    <PreMatchSignatures
      matchId={matchId}
      sheetId={sheet.id}
      sheetStatus={sheet.status}
      sheetVersion={sheet.version}
      homeTeamName={match.homeTeam?.nom ?? "Équipe domicile"}
      awayTeamName={match.awayTeam?.nom ?? "Équipe extérieure"}
      signatures={preMatchSignatures}
      reservations={preMatchReservations}
      isPhaseComplete={isComplete}
      editableActorRole={editableActorRole}
    />
  );
}
