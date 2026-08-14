import { NextRequest } from "next/server";
import { getCurrentSession, verifySessionToken, type SsoUser } from "@/lib/session";

/**
 * Authentifie une requête soit par le cookie de session (navigateur), soit
 * par `Authorization: Bearer <token>` — pour un appel serveur-à-serveur
 * d'une autre app relayant le JWT du membre courant (ex. ticketing,
 * même convention que notifications pour ses apps clientes). Utilisé
 * par les routes /api/members/me/* qui doivent rester lisibles depuis un
 * navigateur (ob) ET depuis un backend d'une autre app.
 */
export async function getRequestSession(request: NextRequest): Promise<SsoUser | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (bearerToken) return verifySessionToken(bearerToken);
  return getCurrentSession();
}
