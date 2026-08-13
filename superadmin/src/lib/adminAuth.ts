import { NextRequest, NextResponse } from "next/server";
import { getSsoSession, getSsoSessionFromRequest, redirectToLogin, type SsoUser } from "./ssoSession";
import { canAccessFederation, canAccessLeague, canAccessPlatform } from "../../../packages/auth-shared/src/roles";

export { canAccessFederation, canAccessLeague, canAccessPlatform };

/**
 * Garde d'accès au back-office : anciennement un login unique codé en dur
 * (ADMIN_USER/ADMIN_PASS), remplacé par une vraie session SSO avec le rôle
 * SUPERADMIN (table `User` partagée). Les noms exportés sont inchangés pour
 * ne pas toucher aux ~40 routes/pages qui les appellent déjà.
 *
 * migration.md §7/§9 : `SUPERADMIN` est interprété comme
 * `PLATFORM_SUPERADMIN` (accès plateforme complet, historique conservé) —
 * `isSuperAdmin`/`ensureAdminAuth`/`hasAdminSession` restent donc un gate
 * "accès total", volontairement PAS élargi à FEDERATION_ADMIN/LEAGUE_ADMIN
 * (élargir ce gate donnerait par erreur un accès plateforme complet à ces
 * rôles sur les ~40 routes qui ne font aucune autre vérification). Les
 * routes qui doivent accepter un FEDERATION_ADMIN/LEAGUE_ADMIN dans son
 * seul périmètre utilisent `ensureFederationAccess`/`ensureLeagueAccess`
 * ci-dessous, en plus ou à la place de `ensureAdminAuth`.
 */

function isPlatformSuperAdminRole(role: string | undefined): boolean {
  return role === "SUPERADMIN" || role === "PLATFORM_SUPERADMIN";
}

async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const session = await getSsoSessionFromRequest(request);
  return isPlatformSuperAdminRole(session?.role);
}

export async function ensureAdminAuth(request: NextRequest) {
  if (await isSuperAdmin(request)) {
    return null;
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function hasAdminSession() {
  const session = await getSsoSession();
  return isPlatformSuperAdminRole(session?.role);
}

/**
 * Équivalent `getAdminSession` pour les Server Components (pas de
 * `NextRequest`, cookie lu via `next/headers` comme `hasAdminSession`).
 * Réservé à `PLATFORM_SUPERADMIN`/`FEDERATION_ADMIN` — pas `LEAGUE_ADMIN`,
 * dont aucune route Phase 2/3/4 ne reconnaît le scope aujourd'hui
 * (`canAccessFederation` dans packages/auth-shared/src/roles.ts renvoie
 * `false` pour ce rôle) : l'inclure ici ferait passer le gate de page à un
 * LEAGUE_ADMIN qui se heurterait ensuite à des 403 partout. Utilisé par
 * les pages `superadmin` qui consomment des routes déjà scopées par
 * fédération (staff-invitations, transferts) plutôt que `hasAdminSession`
 * (accès plateforme complet uniquement).
 */
export async function getAdminPageSession(): Promise<SsoUser | null> {
  const session = await getSsoSession();
  if (!session) return null;
  const allowedRoles: SsoUser["role"][] = ["SUPERADMIN", "PLATFORM_SUPERADMIN", "FEDERATION_ADMIN"];
  return allowedRoles.includes(session.role) ? session : null;
}

/**
 * Garde pour les routes de LECTURE de données de référence (fédérations,
 * ligues, équipes...) qui n'exposent rien de sensible en elles-mêmes —
 * contrairement à `ensureAdminAuth` (accès plateforme complet), accepte
 * aussi `FEDERATION_ADMIN`. Ne remplace jamais une vérification de scope
 * sur une ÉCRITURE : `ensureFederationAccess`/`ensureLeagueAccess`
 * restent obligatoires pour les routes POST/PUT/DELETE/PATCH.
 */
export async function ensureAdminOrFederationAuth(request: NextRequest) {
  const session = await getAdminSession(request);
  if (session && (isPlatformSuperAdminRole(session.role) || session.role === "FEDERATION_ADMIN")) {
    return null;
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Session complète du compte admin appelant, quel que soit son rôle
 * (PLATFORM_SUPERADMIN/FEDERATION_ADMIN/LEAGUE_ADMIN inclus) — utile aux
 * routes qui doivent lire le scope (`federationId`/`leagueId`) pour
 * l'appliquer à une requête (ex: filtrer une liste par fédération), pas
 * seulement décider d'un accès binaire.
 */
export async function getAdminSession(request: NextRequest): Promise<SsoUser | null> {
  const session = await getSsoSessionFromRequest(request);
  if (!session) return null;
  const allowedRoles: SsoUser["role"][] = [
    "SUPERADMIN",
    "PLATFORM_SUPERADMIN",
    "FEDERATION_ADMIN",
    "LEAGUE_ADMIN",
  ];
  return allowedRoles.includes(session.role) ? session : null;
}

/**
 * Garde pour une ressource au niveau fédération (migration.md §9) :
 * PLATFORM_SUPERADMIN/SUPERADMIN passent toujours, FEDERATION_ADMIN
 * uniquement si `session.federationId === federationId`, tout autre rôle
 * (y compris LEAGUE_ADMIN — une ligue ne gère pas sa fédération) est
 * refusé. `federationId` doit être l'identifiant réellement relu en base
 * pour la ressource ciblée, jamais une valeur reprise telle quelle du
 * corps de la requête sans vérification (migration.md §3).
 */
export async function ensureFederationAccess(request: NextRequest, federationId: string) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessFederation(session, federationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Garde pour une ressource au niveau ligue (migration.md §9) :
 * PLATFORM_SUPERADMIN/SUPERADMIN passent toujours, LEAGUE_ADMIN
 * uniquement sur sa propre ligue, FEDERATION_ADMIN sur les ligues de sa
 * fédération — `leagueFederationId` doit alors être fourni par l'appelant
 * (relu en base sur la ligue ciblée) : omis, un FEDERATION_ADMIN est
 * refusé plutôt que supposé autorisé.
 */
export async function ensureLeagueAccess(
  request: NextRequest,
  leagueId: string,
  leagueFederationId?: string | null,
) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessLeague(session, leagueId, leagueFederationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export { redirectToLogin };
