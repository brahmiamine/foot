/**
 * Shared service-to-service client for the notifications API.
 *
 * This package deliberately contains transport code only. It does not know
 * about club, federation, match or referee business rules. Applications keep
 * ownership of which domain event should trigger a notification while sharing
 * one implementation for delivery, authentication and error handling.
 */

export type NotifyTargetType = 'USER' | 'TEAM' | 'ROLE' | 'MEMBERS'

export interface NotifyTarget {
  type: NotifyTargetType
  teamId?: string
  role?: string
  userIds?: string[]
}

export interface NotifyPayload {
  /** Idempotency key: the same event must not be notified twice. */
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

export interface NotificationClientConfig {
  baseUrl?: string
  apiKey?: string
  timeoutMs?: number
}

function resolveConfig(config: NotificationClientConfig = {}): Required<NotificationClientConfig> | null {
  const baseUrl = config.baseUrl ?? process.env.NOTIFICATION_API_URL
  const apiKey = config.apiKey ?? process.env.NOTIFICATION_API_KEY

  if (!baseUrl || !apiKey) return null

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    apiKey,
    timeoutMs: config.timeoutMs ?? 5000,
  }
}

async function sendNotification(
  payload: NotifyPayload,
  config: NotificationClientConfig = {},
): Promise<Response> {
  const resolved = resolveConfig(config)
  if (!resolved) {
    throw new Error('NOTIFICATION_API_URL/NOTIFICATION_API_KEY not configured')
  }

  return fetch(`${resolved.baseUrl}/internal/notifications`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': resolved.apiKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(resolved.timeoutMs),
  })
}

/**
 * Best-effort delivery for normal business flows. Notification outages must
 * not make the originating transaction fail.
 */
export async function notify(
  payload: NotifyPayload,
  config: NotificationClientConfig = {},
): Promise<void> {
  if (!resolveConfig(config)) return

  try {
    const response = await sendNotification(payload, config)
    if (!response.ok) {
      console.error(
        `[notifications-client] notifications responded ${response.status} for type=${payload.type}`,
      )
    }
  } catch (error) {
    console.error(
      `[notifications-client] failed to reach notifications for type=${payload.type}`,
      error,
    )
  }
}

/**
 * Strict delivery variant for outbox workers. Failures are propagated so the
 * worker can persist retry/backoff state instead of silently losing an event.
 */
export async function deliverNotification(
  payload: NotifyPayload,
  config: NotificationClientConfig = {},
): Promise<void> {
  const response = await sendNotification(payload, config)
  if (!response.ok) {
    throw new Error(`notifications responded ${response.status} for type=${payload.type}`)
  }
}
