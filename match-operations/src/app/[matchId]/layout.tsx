import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MatchService } from "@/services/MatchService";
import { MatchOfficialAssignmentService } from "@/services/MatchOfficialAssignmentService";

const OFFICIAL_ROLES = new Set(["REFEREE", "MATCH_OFFICIAL", "REFEREE_OBSERVER"]);

/**
 * Vérifie que le compte connecté a réellement le droit d'accéder à CE
 * match — sinon 404, pour éviter qu'un club édite/consulte la feuille d'un
 * autre club, ou qu'un officiel accède à un match auquel il n'est pas
 * affecté. S'applique à toutes les sous-routes ([matchId]/pre-match,
 * /live, ...).
 *
 * Deux vérifications distinctes (voir src/middleware.ts, qui ne peut pas
 * lui-même interroger la base — runtime Edge) :
 * - compte de club (x-sso-team-id) : appartenance à l'une des deux équipes
 *   du match (comportement historique, inchangé) ;
 * - officiel de match (migration.md §11, Phase 4) : affectation ACTIVE
 *   réelle sur ce match précis (`match_official_assignments`), jamais
 *   uniquement le rôle REFEREE/MATCH_OFFICIAL/REFEREE_OBSERVER porté par
 *   le JWT (migration.md §3 — ne jamais faire confiance au seul scope
 *   client).
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
  const userId = requestHeaders.get("x-sso-user-id");
  const role = requestHeaders.get("x-sso-role");

  const matchService = new MatchService();
  const match = await matchService.findById(matchId);
  if (!match) {
    notFound();
  }

  if (teamId) {
    if (match.equipeHome !== teamId && match.equipeAway !== teamId) {
      notFound();
    }
    return <>{children}</>;
  }

  if (role && OFFICIAL_ROLES.has(role) && userId) {
    const assignment = await new MatchOfficialAssignmentService().findActiveAssignment(userId, matchId);
    if (!assignment) {
      notFound();
    }
    return <>{children}</>;
  }

  notFound();
}
