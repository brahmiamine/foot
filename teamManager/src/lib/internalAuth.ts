import { NextRequest, NextResponse } from "next/server";

/**
 * Garde d'accès pour les routes internes appelées par d'autres apps
 * (aujourd'hui : matchsheet), pas par un navigateur avec une session SSO.
 * Authentification par secret partagé, jamais par cookie de session.
 */
export function ensureInternalAuth(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET;
  const header = request.headers.get("x-internal-secret");

  if (!secret || !header || header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
