import { NextRequest, NextResponse } from "next/server";
import { getSsoSession, getSsoSessionFromRequest, redirectToLogin } from "./ssoSession";

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

export async function ensureAdminAuth(request: NextRequest) {
  if (await isSuperAdmin(request)) {
    return null;
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function hasAdminSession() {
  const session = await getSsoSession();
  return session?.role === "SUPERADMIN";
}

export { redirectToLogin };
