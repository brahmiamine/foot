/**
 * Utilitaires pour l'application ARBINOTE
 */

/**
 * Formate une date selon la locale fournie
 * Note: Toujours utiliser le format français (fr-FR) pour la cohérence
 */
function resolveIntlLocale(locale: string) {
  // Toujours utiliser fr-FR pour un format uniforme : 22/11/2025 14:00
  return 'fr-FR'
}

export function formatDate(date: Date | string, locale: string = 'fr'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  // Toujours utiliser fr-FR pour un format uniforme : 22/11/2025 14:00
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Format 24h au lieu de AM/PM
  }).format(d)
}

/**
 * Formate une date pour l'affichage court (jour/mois)
 */
export function formatDateShort(date: Date | string, locale: string = 'fr'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  // Toujours utiliser fr-FR pour un format uniforme
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  }).format(d)
}

/**
 * Formate une date sans l'heure (jour/mois/année)
 */
export function formatDateOnly(date: Date | string, locale: string = 'fr'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  // Toujours utiliser fr-FR pour un format uniforme : 22/11/2025
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Calcule la moyenne d'un tableau de nombres
 */
export function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const sum = numbers.reduce((acc, val) => acc + val, 0)
  return sum / numbers.length
}

/**
 * Formate une note sur 5 avec 2 décimales
 */
export function formatNote(note: number): string {
  return note.toFixed(2)
}

/**
 * Arrondit une note à 2 décimales
 */
export function roundNote(note: number): number {
  return Math.round(note * 100) / 100
}

export function getLocalizedName(
  locale: string,
  {
    defaultValue,
    fr,
    ar,
    en,
  }: {
    defaultValue: string
    fr?: string | null
    ar?: string | null
    en?: string | null
  }
): string {
  if (locale === 'ar' && ar) {
    return ar
  }
  if (locale === 'en' && en) {
    return en
  }
  if (locale === 'fr' && fr) {
    return fr
  }
  return fr ?? en ?? ar ?? defaultValue
}

/**
 * Obtient le nom d'affichage d'une journée selon la locale
 * Utilise nom_fr/nom_en/nom_ar si disponible, sinon utilise le numéro
 */
export function getJourneeDisplayName(
  journee: {
    numero?: number | null
    nom_fr?: string | null
    nom_en?: string | null
    nom_ar?: string | null
  },
  locale: string
): string {
  // Si un nom localisé existe, l'utiliser
  if (journee.nom_fr || journee.nom_en || journee.nom_ar) {
    return getLocalizedName(locale, {
      defaultValue: journee.nom_fr || '',
      fr: journee.nom_fr,
      en: journee.nom_en,
      ar: journee.nom_ar,
    })
  }
  
  // Sinon, utiliser le numéro comme fallback
  if (journee.numero !== null && journee.numero !== undefined) {
    return `Journée ${journee.numero}`
  }
  
  return 'Journée'
}

const VOTE_DELAY_MINUTES = 30

/**
 * Vérifie si un match peut être voté, à partir du statut réel du match
 * (matches.status, matches.actual_started_at) plutôt que de la date
 * programmée — voir avancement.md, US-01 : la date programmée peut être
 * dépassée sans que le match n'ait réellement commencé (retard, report non
 * reflété, match annulé...), ce qui autorisait des votes prématurés.
 *
 * Conditions :
 * - un arbitre doit être attribué ;
 * - le match doit être IN_PROGRESS ou FINISHED (jamais UPCOMING ni CANCELLED) ;
 * - au moins 30 minutes doivent s'être écoulées depuis actual_started_at.
 */
export function canVoteMatch(match: {
  arbitre_id?: string | null
  status?: 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | null
  actual_started_at?: string | Date | null
}): boolean {
  // Vérifier que l'arbitre est attribué
  if (!match.arbitre_id) {
    return false
  }

  // Le match doit avoir réellement commencé — jamais UPCOMING ni CANCELLED
  if (match.status !== 'IN_PROGRESS' && match.status !== 'FINISHED') {
    return false
  }

  // Un match FINISHED a nécessairement dépassé le délai (il a démarré puis
  // s'est terminé), mais on vérifie quand même actual_started_at s'il est
  // disponible pour rester cohérent avec la règle de délai.
  if (!match.actual_started_at) {
    return match.status === 'FINISHED'
  }

  const startedAt = typeof match.actual_started_at === 'string' ? new Date(match.actual_started_at) : match.actual_started_at
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60))

  return diffMinutes >= VOTE_DELAY_MINUTES
}

/**
 * Valide qu'une chaîne est une adresse IP valide (IPv4 ou IPv6)
 */
function isValidIP(ip: string): boolean {
  // IPv4: 0.0.0.0 à 255.255.255.255
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6: format simplifié (peut être plus complexe)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
  
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.')
    return parts.every(part => {
      const num = parseInt(part, 10)
      return num >= 0 && num <= 255
    })
  }
  
  return ipv6Regex.test(ip)
}

/**
 * Extrait l'adresse IP réelle du client depuis les headers de la requête
 * Gère les proxies (Vercel, Cloudflare, etc.) de manière sécurisée
 * 
 * @param request - L'objet Request Next.js
 * @returns L'adresse IP du client ou 'unknown' si non trouvée
 */
export function getClientIP(request: Request): string {
  try {
    // 1. cf-connecting-ip : uniquement positionné par Cloudflare, fiable si l'app est
    //    déployée derrière Cloudflare (non falsifiable côté client dans ce cas).
    const cfIP = request.headers.get('cf-connecting-ip')
    if (cfIP && isValidIP(cfIP)) {
      return cfIP
    }

    // 2. x-forwarded-for : chaîne "client → proxy1 → proxy2 → serveur".
    //    Un reverse-proxy correctement configuré (ex. nginx avec
    //    $proxy_add_x_forwarded_for) AJOUTE l'IP réelle en fin de chaîne au lieu de la
    //    remplacer : la PREMIÈRE valeur est donc celle annoncée par le client
    //    (falsifiable à volonté), tandis que la DERNIÈRE est celle vue par notre propre
    //    proxy et donc la plus fiable. On part de la fin de la liste.
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
      const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean)
      for (let i = ips.length - 1; i >= 0; i--) {
        if (isValidIP(ips[i])) {
          return ips[i]
        }
      }
    }

    // 3. x-real-ip / x-client-ip : uniquement en dernier recours. Ces headers ne
    //    portent pas de chaîne de proxies et une valeur falsifiée par le client est
    //    indiscernable d'une valeur légitime posée par un reverse-proxy.
    const realIP = request.headers.get('x-real-ip')
    if (realIP && isValidIP(realIP)) {
      return realIP
    }

    const clientIP = request.headers.get('x-client-ip')
    if (clientIP && isValidIP(clientIP)) {
      return clientIP
    }

    // Si aucune IP valide n'est trouvée, retourner 'unknown'
    return 'unknown'
  } catch (error) {
    console.error('Error extracting client IP:', error)
    return 'unknown'
  }
}

