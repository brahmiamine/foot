import { NextRequest } from "next/server";
import { isSameFamilyHostname } from "./redirect";

/**
 * Vérifie que la requête vient bien d'une app de la même famille (`Origin`,
 * ou `Referer` en repli — un formulaire POST classique omet parfois
 * `Origin`). Défense en profondeur pour les actions authentifiées par
 * cookie : `SameSite=Lax` bloque déjà le CSRF venant d'un site externe,
 * mais pas entre sous-domaines de la même famille (`SSO_COOKIE_DOMAIN`) —
 * un script compromis/XSS sur l'une des 6 apps clientes pourrait sinon
 * forger une requête vers ces endpoints avec le cookie de session déjà
 * présent. Ne s'applique qu'aux requêtes authentifiées par cookie : un
 * appel serveur-à-serveur avec `Authorization: Bearer` n'est pas concerné
 * (le jeton n'est jamais mémorisé/rejoué par un navigateur).
 */
export function isTrustedOrigin(request: NextRequest): boolean {
  const source = request.headers.get("origin") ?? request.headers.get("referer");
  if (!source) return false;

  try {
    const url = new URL(source);
    return isSameFamilyHostname(url.hostname);
  } catch {
    return false;
  }
}
