/**
 * Les URLs d'images stockées en base (`/uploads/...`) sont des chemins
 * relatifs générés par club-hub, qui les sert depuis son propre
 * `public/`. Ce site est déployé séparément : on les préfixe avec le
 * domaine de club-hub, sauf si les deux sont déjà derrière le même
 * reverse proxy (NEXT_PUBLIC_CLUB_HUB_URL laissé vide).
 */
export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const base = process.env.NEXT_PUBLIC_CLUB_HUB_URL?.trim().replace(/\/+$/, "");
  return base ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : path;
}
