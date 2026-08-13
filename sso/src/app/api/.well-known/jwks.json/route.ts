import { NextResponse } from "next/server";
import { getJwks } from "@/lib/jwtKeys";

export const runtime = "nodejs";

/**
 * TASK-P0-001 : JWKS public — clé(s) publique(s) RSA utilisées pour vérifier
 * les JWT de session émis par `sso`. Endpoint public (pas d'authentification :
 * ce sont des clés publiques), consommé par packages/auth-shared (apps
 * clientes) et notification-api, avec un cache de 5 minutes côté client
 * (voir jose `createRemoteJWKSet` / `cooldownDuration`).
 */
export async function GET() {
  const jwks = await getJwks();
  return NextResponse.json(jwks, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
