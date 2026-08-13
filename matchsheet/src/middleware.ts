import { NextRequest, NextResponse } from "next/server";
import { getSsoSessionFromRequest, redirectToLogin } from "@/lib/ssoSession";

/**
 * Protège toutes les routes de feuille de match ([matchId]/*). La page
 * d'accueil ("/", simple écran "sélectionnez un match") reste publique.
 *
 * Deux populations acceptées ici :
 * - comptes de club (ADMIN/OBSERVATEUR, avec teamId) — vérifiés ensuite par
 *   [matchId]/layout.tsx (appartenance à l'une des deux équipes du match) ;
 * - officiels de match (REFEREE/MATCH_OFFICIAL/REFEREE_OBSERVER,
 *   migration.md §11, Phase 4), sans teamId — vérifiés ensuite par la même
 *   layout.tsx via une affectation réelle (`match_official_assignments`),
 *   jamais uniquement par la présence de ce rôle dans le JWT.
 *
 * SUPERADMIN/PLATFORM_SUPERADMIN restent refusés (aucun périmètre de match
 * précis), même règle que teamManager (voir teamManager/src/lib/auth.ts).
 * FEDERATION_ADMIN/LEAGUE_ADMIN restent également exclus : leur supervision
 * passe par superadmin, pas par une session matchsheet directe.
 *
 * Ce middleware ne peut PAS lui-même vérifier l'affectation à un match
 * précis (runtime Edge, pas d'accès MySQL/TypeORM ici — voir
 * services/sheetGuard.ts pour l'équivalent runtime Node) : il ne fait
 * qu'authentifier et laisser passer un rôle plausible, la vérification
 * fine reste dans [matchId]/layout.tsx.
 *
 * L'utilisateur vérifié est transmis aux Server Components via des en-têtes
 * (x-sso-*) pour éviter de revérifier le JWT à chaque page.
 *
 * `/api/internal/*` (TS-31, avancement.md) échappe à cette règle : ce sont
 * des routes service-à-service (clé API, voir lib/serviceAuth.ts), jamais
 * une session SSO — c'est justement par ce chemin que superadmin (qui n'a
 * pas de session matchsheet) doit désormais passer au lieu d'écrire
 * directement dans `ms_sheets`.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const OFFICIAL_ROLES = new Set(["REFEREE", "MATCH_OFFICIAL", "REFEREE_OBSERVER"]);

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/api/internal/")) {
    return NextResponse.next();
  }

  const session = await getSsoSessionFromRequest(request);
  if (!session || session.role === "SUPERADMIN" || session.role === "PLATFORM_SUPERADMIN") {
    return redirectToLogin(request);
  }

  const isClubAccount = !!session.teamId;
  const isOfficialAccount = !session.teamId && OFFICIAL_ROLES.has(session.role);
  if (!isClubAccount && !isOfficialAccount) {
    return redirectToLogin(request);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-sso-user-id", session.id);
  if (session.teamId) {
    requestHeaders.set("x-sso-team-id", session.teamId);
  }
  requestHeaders.set("x-sso-role", session.role);
  requestHeaders.set("x-sso-name", session.name);

  return NextResponse.next({ request: { headers: requestHeaders } });
}
