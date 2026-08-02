import { NextResponse } from 'next/server'
import { getClientIP } from './utils'

/**
 * Anti scraping/abus sur les endpoints publics de lecture : fenêtre glissante
 * en mémoire, par IP et par route. Suffisant pour un déploiement mono-instance
 * (pas besoin de Redis). Les visiteurs normaux n'en approchent jamais la limite.
 */

const DEFAULT_WINDOW_MS = 60 * 1000 // 1 minute
const DEFAULT_MAX_REQUESTS = 60

const requestsByKey = new Map<string, number[]>()
let callCount = 0

function isRateLimited(key: string, windowMs: number, max: number): boolean {
  const now = Date.now()
  const timestamps = (requestsByKey.get(key) ?? []).filter((t) => now - t < windowMs)
  timestamps.push(now)
  requestsByKey.set(key, timestamps)

  // Nettoyage opportuniste pour éviter une croissance non bornée de la map
  // au fil du temps (IPs qui ne reviennent plus).
  callCount += 1
  if (callCount % 1000 === 0) {
    for (const [k, v] of requestsByKey) {
      if (v.every((t) => now - t >= windowMs)) {
        requestsByKey.delete(k)
      }
    }
  }

  return timestamps.length > max
}

/**
 * À appeler en tout début de handler GET public. Retourne une réponse 429
 * (à `return` immédiatement) si la limite est dépassée, sinon `null`.
 */
export function enforcePublicRateLimit(
  request: Request,
  routeName: string,
  options?: { windowMs?: number; max?: number }
): NextResponse | null {
  const ip = getClientIP(request)
  // Pas d'IP fiable identifiée : on ne peut pas limiter par IP, on laisse passer
  // plutôt que de bloquer tout le monde derrière la même valeur "unknown".
  if (ip === 'unknown') return null

  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS
  const max = options?.max ?? DEFAULT_MAX_REQUESTS

  if (isRateLimited(`${routeName}:${ip}`, windowMs, max)) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
      { status: 429 }
    )
  }

  return null
}
