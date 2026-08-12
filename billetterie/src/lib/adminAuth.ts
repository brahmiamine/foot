import { NextRequest, NextResponse } from "next/server";
import { getSsoSession, getSsoSessionFromRequest } from "./ssoSession";

/**
 * Garde d'accès au back-office billetterie (ADMIN/SUPERADMIN), même
 * convention que superadmin/arbinote/src/lib/adminAuth.ts. OBSERVATEUR
 * (lecture seule) est volontairement exclu : ce back-office n'expose pour
 * l'instant que des actions de modération (voir /admin/audience-mismatch).
 */

const ADMIN_ROLES = new Set(["ADMIN", "SUPERADMIN"]);

async function isAdmin(request: NextRequest): Promise<boolean> {
  const session = await getSsoSessionFromRequest(request);
  return !!session && ADMIN_ROLES.has(session.role);
}

export async function ensureAdminAuth(request: NextRequest) {
  if (await isAdmin(request)) {
    return null;
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function hasAdminSession(): Promise<boolean> {
  const session = await getSsoSession();
  return !!session && ADMIN_ROLES.has(session.role);
}
