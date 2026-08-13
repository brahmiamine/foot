import { NextRequest, NextResponse } from "next/server";
import { getSsoSession, getSsoSessionFromRequest, redirectToLogin, type SsoUser } from "./ssoSession";
import { getClientIP } from "./utils";
import { canAccessFederation, canAccessPlatform } from "../../../packages/auth-shared/src/roles";

export { canAccessFederation, canAccessPlatform };

/**
 * Garde d'accès au back-office : anciennement un login unique codé en dur
 * (ADMIN_USER/ADMIN_PASS), remplacé par une vraie session SSO avec le rôle
 * SUPERADMIN (table `User` partagée). Les noms exportés sont inchangés pour
 * ne pas toucher aux ~25 routes/pages qui les appellent déjà.
 */

/** migration.md §7 : PLATFORM_SUPERADMIN est l'alias cible de SUPERADMIN, accès plateforme complet équivalent. */
function isPlatformSuperAdminRole(role: string | undefined): boolean {
  return role === "SUPERADMIN" || role === "PLATFORM_SUPERADMIN";
}

async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const session = await getSsoSessionFromRequest(request);
  return isPlatformSuperAdminRole(session?.role);
}

/**
 * TASK-P0-026 : journalise chaque accès refusé aux routes admin (pas
 * d'infra de métriques dans ce repo — console structuré, cohérent avec le
 * reste de l'app). Distingue "pas de session" de "session sans rôle
 * SUPERADMIN" pour aider à repérer un compte compromis vs un simple jeton
 * expiré.
 */
async function logUnauthorizedAdminAccess(request: NextRequest): Promise<void> {
  const session = await getSsoSessionFromRequest(request);
  console.warn(
    JSON.stringify({
      event: "admin_access_denied",
      path: request.nextUrl.pathname,
      method: request.method,
      reason: session ? `role=${session.role}` : "no_session",
      ip: getClientIP(request),
      timestamp: new Date().toISOString(),
    }),
  );
}

export async function ensureAdminAuth(request: NextRequest) {
  if (await isSuperAdmin(request)) {
    return null;
  }
  await logUnauthorizedAdminAccess(request);
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function hasAdminSession() {
  const session = await getSsoSession();
  return isPlatformSuperAdminRole(session?.role);
}

/**
 * migration.md §9/§12 (Phase 5) : accès aux évaluations officielles
 * d'arbitre — réservé à REFEREE_OBSERVER (auteur des rapports),
 * FEDERATION_ADMIN (homologation) et PLATFORM_SUPERADMIN/SUPERADMIN (accès
 * complet). Distinct de `ensureAdminAuth` (accès plateforme complet
 * uniquement) : ne jamais l'utiliser pour les routes du back-office
 * général existant.
 */
const OFFICIAL_EVAL_ROLES = new Set(["SUPERADMIN", "PLATFORM_SUPERADMIN", "FEDERATION_ADMIN", "REFEREE_OBSERVER"]);

export async function getOfficialEvalSession(request: NextRequest): Promise<SsoUser | null> {
  const session = await getSsoSessionFromRequest(request);
  if (!session || !OFFICIAL_EVAL_ROLES.has(session.role)) {
    return null;
  }
  return session;
}

export { redirectToLogin };
