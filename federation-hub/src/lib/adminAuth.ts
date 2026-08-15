import { NextRequest, NextResponse } from "next/server";
import { getSsoSession, getSsoSessionFromRequest, redirectToLogin, type SsoUser } from "./ssoSession";
import { canAccessFederation, canAccessLeague, canAccessPlatform } from "../../../packages/auth-shared/src/roles";
import { getDataSource } from "./db";
import { hasRegulatoryPermission, resolveRegulatoryPermission } from "./regulatoryPermissions";

export { canAccessFederation, canAccessLeague, canAccessPlatform };

function isPlatformSuperAdminRole(role: string | undefined): boolean {
  return role === "SUPERADMIN" || role === "PLATFORM_SUPERADMIN";
}

async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const session = await getSsoSessionFromRequest(request);
  return isPlatformSuperAdminRole(session?.role);
}

export async function ensureAdminAuth(request: NextRequest) {
  if (await isSuperAdmin(request)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function hasAdminSession() {
  const session = await getSsoSession();
  return isPlatformSuperAdminRole(session?.role);
}

export async function getCompetitionAdminPageSession(): Promise<SsoUser | null> {
  const session = await getSsoSession();
  if (!session) return null;
  const allowedRoles: SsoUser["role"][] = ["SUPERADMIN", "PLATFORM_SUPERADMIN", "FEDERATION_ADMIN", "LEAGUE_ADMIN"];
  return allowedRoles.includes(session.role) ? session : null;
}

export async function getAdminPageSession(): Promise<SsoUser | null> {
  const session = await getSsoSession();
  if (!session) return null;
  const allowedRoles: SsoUser["role"][] = ["SUPERADMIN", "PLATFORM_SUPERADMIN", "FEDERATION_ADMIN"];
  return allowedRoles.includes(session.role) ? session : null;
}

export async function ensureAdminOrFederationAuth(request: NextRequest) {
  const session = await getAdminSession(request);
  if (session && (isPlatformSuperAdminRole(session.role) || session.role === "FEDERATION_ADMIN")) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Point d'entrée commun des API admin. Les rôles continuent de définir le
 * périmètre maximal (plateforme/fédération/ligue). Pour les routes migration-v2,
 * une permission fine est résolue depuis l'URL et vérifiée en base.
 *
 * Migration progressive : un compte sans aucune ligne dans
 * regulatory_user_permissions conserve ses droits historiques. Dès qu'au moins
 * une ligne existe, il passe en liste blanche pour tout le domaine réglementaire.
 */
export async function getAdminSession(request: NextRequest): Promise<SsoUser | null> {
  const session = await getSsoSessionFromRequest(request);
  if (!session) return null;
  const allowedRoles: SsoUser["role"][] = ["SUPERADMIN", "PLATFORM_SUPERADMIN", "FEDERATION_ADMIN", "LEAGUE_ADMIN"];
  if (!allowedRoles.includes(session.role)) return null;

  const requiredPermission = resolveRegulatoryPermission(request.nextUrl.pathname, request.method);
  if (requiredPermission && !await hasRegulatoryPermission(await getDataSource(), session, requiredPermission)) return null;
  return session;
}

const REFEREE_DOMAIN_ROLES = new Set<SsoUser["role"]>([
  "SUPERADMIN", "PLATFORM_SUPERADMIN", "FEDERATION_ADMIN", "LEAGUE_ADMIN", "REFEREE_OBSERVER",
]);

export async function getRefereeDomainSession(request: NextRequest): Promise<SsoUser | null> {
  const session = await getSsoSessionFromRequest(request);
  return session && REFEREE_DOMAIN_ROLES.has(session.role) ? session : null;
}

export async function getRefereeDomainPageSession(): Promise<SsoUser | null> {
  const session = await getSsoSession();
  return session && REFEREE_DOMAIN_ROLES.has(session.role) ? session : null;
}

export const getOfficialEvalSession = getRefereeDomainSession;
export const getOfficialEvalPageSession = getRefereeDomainPageSession;

export async function ensureFederationAccess(request: NextRequest, federationId: string) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessFederation(session, federationId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function ensureLeagueAccess(request: NextRequest, leagueId: string, leagueFederationId?: string | null) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessLeague(session, leagueId, leagueFederationId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export { redirectToLogin };
