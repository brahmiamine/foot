import { notFound } from "next/navigation";
import { MatchService } from "@/services/MatchService";
import { SheetService } from "@/services/SheetService";
import { SignatureService } from "@/services/SignatureService";
import { ReservationService } from "@/services/ReservationService";
import { PostMatchSignatures } from "./PostMatchSignatures";

export const dynamic = "force-dynamic";

export default async function PostMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
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

  const [signatures, reservations, isComplete] = await Promise.all([
    signatureService.findBySheet(sheet.id),
    reservationService.findBySheet(sheet.id),
    signatureService.isPhaseComplete(sheet.id, "POST_MATCH"),
  ]);

  const postMatchSignatures = signatures
    .filter((s) => s.phase === "POST_MATCH")
    .map((s) => ({
      id: s.id,
      actorRole: s.actorRole,
      signerName: s.signerName ?? null,
      signatureData: s.signatureData,
      signedAt: s.signedAt.toISOString(),
    }));

  const postMatchReservations = reservations
    .filter((r) => r.phase === "POST_MATCH")
    .map((r) => ({
      id: r.id,
      authorRole: r.authorRole,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }));

  return (
    <PostMatchSignatures
      matchId={matchId}
      sheetId={sheet.id}
      sheetStatus={sheet.status}
      homeTeamName={match.homeTeam?.nom ?? "Équipe domicile"}
      awayTeamName={match.awayTeam?.nom ?? "Équipe extérieure"}
      signatures={postMatchSignatures}
      reservations={postMatchReservations}
      isPhaseComplete={isComplete}
      closedAt={sheet.closedAt ? sheet.closedAt.toISOString() : null}
    />
  );
}
