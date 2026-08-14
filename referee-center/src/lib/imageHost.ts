/**
 * next/image refuse (erreur bloquante, pas de fallback) toute image dont l'hôte
 * n'est pas explicitement autorisé dans `images.remotePatterns` de next.config.ts.
 * Les logos d'équipes/fédérations/ligues peuvent provenir d'un import externe
 * (flashscore, wikipedia, uefa, fifa, football-data, api-sports) ou d'un upload
 * local (`/api/uploads/...`, même origine). Cette fonction doit rester synchronisée
 * avec la liste `images.remotePatterns` de next.config.ts : elle sert à décider,
 * avant de rendre `next/image`, si l'hôte est bien couvert — sinon on retombe sur
 * une balise <img> classique plutôt que de faire planter le rendu de la page.
 */

const ALLOWED_HOSTNAME_PATTERNS: RegExp[] = [
  /^static\.flashscore\.com$/,
  /^ssl\.gstatic\.com$/,
  /(^|\.)gstatic\.com$/,
  /^upload\.wikimedia\.org$/,
  /(^|\.)wikipedia\.org$/,
  /^img\.uefa\.com$/,
  /(^|\.)fifa\.com$/,
  /^crests\.football-data\.org$/,
  /^media\.api-sports\.io$/,
  /^media-.*\.api-sports\.io$/,
]

/**
 * Indique si une URL d'image peut être passée à next/image sans risquer l'erreur
 * "hostname not configured". Les chemins relatifs (même origine) sont toujours sûrs.
 */
export function isNextImageSafe(url: string | null | undefined): boolean {
  if (!url) return false
  if (url.startsWith('/')) return true

  try {
    const { hostname, protocol } = new URL(url)
    if (protocol !== 'https:') return false
    return ALLOWED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname))
  } catch {
    return false
  }
}
