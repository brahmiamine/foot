import { cookies } from "next/headers";
import { getSsoCookieName } from "../../../packages/auth-shared/src/session";

export interface MemberPaymentProfile {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
}

/**
 * Lit firstName/lastName/phoneNumber du membre connecté auprès de `sso`
 * (GET /api/members/me/profile). Ces champs ne sont pas dans le JWT de
 * session (voir sso/src/lib/session.ts et packages/auth-shared/src/session)
 * — volontairement gardé minimal (id/email/name/role/teamId) — donc lus à
 * la demande, uniquement quand nécessaires (voir lib/paymentApiClient.ts :
 * Paymee seul en a besoin).
 *
 * Appel serveur-à-serveur, pas de credentials automatiques comme dans un
 * navigateur : on transmet nous-mêmes le cookie de session du visiteur
 * (déjà vérifié par `getSsoSession()` avant d'en arriver là) dans l'en-tête
 * Cookie de la requête sortante vers `sso`, qui le revérifie normalement.
 */
export async function fetchBuyerPaymentProfile(): Promise<MemberPaymentProfile | null> {
  const ssoUrl = process.env.SSO_URL;
  if (!ssoUrl) {
    throw new Error("SSO_URL doit être configuré pour lire le profil du membre.");
  }

  const store = await cookies();
  const cookieName = getSsoCookieName();
  const token = store.get(cookieName)?.value;
  if (!token) return null;

  const response = await fetch(`${ssoUrl}/api/members/me/profile`, {
    headers: { Cookie: `${cookieName}=${token}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json().catch(() => ({}))) as {
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
  };

  return {
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    phoneNumber: data.phoneNumber ?? null,
  };
}
