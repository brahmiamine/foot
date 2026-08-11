/**
 * Client HTTP vers `notification-api` (POST /internal/notifications).
 * Authentification par clé de service (`x-api-key`), jamais par le JWT
 * SSO d'un utilisateur — voir notification-api/src/auth/guards/service-auth.guard.ts.
 *
 * Ne bloque jamais l'opération métier qui déclenche une notification :
 * si NOTIFICATION_API_URL/NOTIFICATION_API_KEY sont absents (notification-api
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
        `[notificationClient] notification-api responded ${response.status} for type=${payload.type}`
      )
    }
  } catch (error) {
    console.error(`[notificationClient] failed to reach notification-api for type=${payload.type}`, error)
  }
}
