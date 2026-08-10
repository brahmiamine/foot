import { headers } from "next/headers";
import type { SsoUser } from "./ssoSession";

/**
 * Lit l'utilisateur SSO déjà vérifié par le middleware (en-têtes x-sso-*,
 * voir middleware.ts). Réservé aux Server Components / Route Handlers /
 * Server Actions — jamais au middleware lui-même (qui, lui, revérifie le
 * JWT via ssoSession.ts). Retourne `null` sur la page publique "/" (exemptée
 * du middleware) ou si les en-têtes sont absents pour toute autre raison.
 */
export async function getSsoUserFromHeaders(): Promise<SsoUser | null> {
  const headerList = await headers();
  const id = headerList.get("x-sso-user-id");
  const teamId = headerList.get("x-sso-team-id");
  const role = headerList.get("x-sso-role");
  const name = headerList.get("x-sso-name");

  if (!id || !role) {
    return null;
  }

  return {
    id,
    email: "",
    name: name ?? "",
    role: role as SsoUser["role"],
    teamId: teamId ?? null,
  };
}
