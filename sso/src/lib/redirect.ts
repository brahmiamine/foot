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

  const cookieDomain = process.env.SSO_COOKIE_DOMAIN;
  if (cookieDomain) {
    const suffix = cookieDomain.startsWith(".") ? cookieDomain : `.${cookieDomain}`;
    if (!(`.${url.hostname}`).endsWith(suffix) && url.hostname !== suffix.slice(1)) {
      return null;
    }
  } else if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return null;
  }

  return url.toString();
}
