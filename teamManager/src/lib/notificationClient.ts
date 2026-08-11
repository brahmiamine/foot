import { cookies } from "next/headers";
import { getSsoCookieName } from "../../../packages/auth-shared/src/session";

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

/**
 * Abonnements Web Push (`/api/push-subscriptions`) : contrairement à
 * `notify()` ci-dessus, ces appels représentent l'utilisateur courant, pas
 * teamManager lui-même — le JWT `sso` de sa session est relayé en
 * `Authorization: Bearer`, jamais la clé de service (voir
 * notification-api/src/auth/guards/jwt-auth.guard.ts).
 */
export type PushPlatform = 'WEB' | 'IOS' | 'ANDROID'

export interface PushSubscriptionRecord {
  deviceId: string
  platform: PushPlatform
  createdAt: string
}

class NotificationApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

async function getSsoToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(getSsoCookieName())?.value ?? null
}

function apiBaseUrl(): string {
  const url = process.env.NOTIFICATION_API_URL
  if (!url) throw new Error('NOTIFICATION_API_URL must be set')
  return url.replace(/\/$/, '')
}

async function callPushApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSsoToken()
  if (!token) throw new NotificationApiError(401, 'Not authenticated')

  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new NotificationApiError(res.status, `notification-api ${path} -> ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function fetchPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  return callPushApi('/api/push-subscriptions')
}

export async function registerPushSubscription(input: {
  deviceId: string
  platform: PushPlatform
  endpoint?: string
  p256dh?: string
  auth?: string
}): Promise<PushSubscriptionRecord> {
  return callPushApi('/api/push-subscriptions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function removePushSubscription(deviceId: string): Promise<void> {
  await callPushApi(`/api/push-subscriptions/${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
}
