import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MatchService } from "@/services/MatchService";

/**
 * Vérifie que le compte connecté (voir src/middleware.ts, qui transmet
 * x-sso-team-id) appartient bien à l'une des deux équipes du match — sinon
 * 404, pour éviter qu'un club édite/consulte la feuille d'un autre club.
 * S'applique à toutes les sous-routes ([matchId]/pre-match, /live, ...).
 */
export default async function MatchIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const requestHeaders = await headers();
  const teamId = requestHeaders.get("x-sso-team-id");

  const matchService = new MatchService();
  const match = await matchService.findById(matchId);
  if (!match) {
    notFound();
  }

  if (match.equipeHome !== teamId && match.equipeAway !== teamId) {
    notFound();
  }

  return <>{children}</>;
}
