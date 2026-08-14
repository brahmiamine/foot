/**
 * Client HTTP vers `notifications` (POST /internal/notifications).
 * Authentification par clé de service (`x-api-key`), jamais par le JWT
 * SSO d'un utilisateur — voir notifications/src/auth/guards/service-auth.guard.ts.
 *
 * Ne bloque jamais l'opération métier qui déclenche une notification :
 * si NOTIFICATION_API_URL/NOTIFICATION_API_KEY sont absents (notifications
 * pas encore déployé pour cet environnement) ou si l'appel échoue, l'erreur
 * est journalisée et avalée, jamais propagée à l'appelant.
 */

export type NotifyTargetType = 'USER' | 'TEAM' | 'ROLE' | 'MEMBERS'

export interface NotifyTarget {
  type: NotifyTargetType
  teamId?: string
  role?: string
  userIds?: string[]
}

export interface NotifyPayload {
  /** Clé d'idempotence : un même eventId n'est jamais notifié deux fois. */
  eventId?: string
  type: string
  userId?: string
  target?: NotifyTarget
  teamId?: string
  category?: string
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function notify(payload: NotifyPayload): Promise<void> {
  const baseUrl = process.env.NOTIFICATION_API_URL
  const apiKey = process.env.NOTIFICATION_API_KEY
  if (!baseUrl || !apiKey) {
    return
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/internal/notifications`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) {
      console.error(
        `[notificationClient] notifications responded ${response.status} for type=${payload.type}`
      )
    }
  } catch (error) {
    console.error(`[notificationClient] failed to reach notifications for type=${payload.type}`, error)
  }
}

/**
 * Variante qui LÈVE en cas d'échec (URL/clé absents inclus), pour
 * `NotificationOutboxService` (TS-25/TS-26) — c'est le worker outbox qui
 * doit savoir qu'une tentative a échoué pour programmer un retry, jamais
 * cette fonction elle-même. Ne pas utiliser ailleurs qu'à l'intérieur du
 * worker : tout autre appelant doit passer par `notify()` (best-effort)
 * ou, mieux, par l'outbox.
 */
export async function deliverNotification(payload: NotifyPayload): Promise<void> {
  const baseUrl = process.env.NOTIFICATION_API_URL
  const apiKey = process.env.NOTIFICATION_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('NOTIFICATION_API_URL/NOTIFICATION_API_KEY not configured')
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/internal/notifications`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    throw new Error(`notifications responded ${response.status} for type=${payload.type}`)
  }
}
