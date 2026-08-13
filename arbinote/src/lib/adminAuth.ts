import { NextRequest, NextResponse } from "next/server";
import { getSsoSession, getSsoSessionFromRequest, redirectToLogin } from "./ssoSession";
import { getClientIP } from "./utils";

/**
 * Garde d'accès au back-office : anciennement un login unique codé en dur
 * (ADMIN_USER/ADMIN_PASS), remplacé par une vraie session SSO avec le rôle
 * SUPERADMIN (table `User` partagée). Les noms exportés sont inchangés pour
 * ne pas toucher aux ~25 routes/pages qui les appellent déjà.
 */

async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const session = await getSsoSessionFromRequest(request);
  return session?.role === "SUPERADMIN";
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
  return session?.role === "SUPERADMIN";
}

export { redirectToLogin };
