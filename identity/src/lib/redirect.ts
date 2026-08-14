/**
 * Vrai si `hostname` appartient à la même "famille" que le cookie de
 * session (même suffixe que `SSO_COOKIE_DOMAIN`, ou localhost en dev).
 * Utilisé à la fois pour valider une redirection (sanitizeRedirect) et pour
 * vérifier l'origine d'une requête d'état (voir lib/csrf.ts).
 */
export function isSameFamilyHostname(hostname: string): boolean {
  const cookieDomain = process.env.SSO_COOKIE_DOMAIN;
  if (cookieDomain) {
    const suffix = cookieDomain.startsWith(".") ? cookieDomain : `.${cookieDomain}`;
    return `.${hostname}`.endsWith(suffix) || hostname === suffix.slice(1);
  }
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * N'autorise à rediriger que vers une app de la même "famille" (même domaine
 * parent que le cookie de session, ou localhost en dev) : évite qu'un lien
 * de connexion piégé (?redirect=https://evil.example) ne redirige
 * l'utilisateur après authentification vers un site tiers.
 */
export function sanitizeRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!isSameFamilyHostname(url.hostname)) return null;

  return url.toString();
}
