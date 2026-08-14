import { getSsoToken } from "@/lib/ssoSession";

export type PushPlatform = "WEB" | "IOS" | "ANDROID";

export interface PushSubscriptionRecord {
  deviceId: string;
  platform: PushPlatform;
  createdAt: string;
}

/**
 * Client serveur-à-serveur vers notifications pour la gestion de
 * l'abonnement Web Push du compte connecté (staff referee-center — alertes de
 * vote, anomalies) : referee-center ne signe jamais de requête en son nom, il
 * relaie le JWT `sso` de l'utilisateur courant (Authorization: Bearer, voir
 * notifications/src/auth/guards/jwt-auth.guard.ts). Même convention que
 * ob/src/lib/notificationApi.ts, réduite aux seuls abonnements push — pas
 * de boîte de réception dans referee-center.
 */
class NotificationApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function baseUrl(): string {
  const url = process.env.NOTIFICATION_API_URL;
  if (!url) throw new Error("NOTIFICATION_API_URL must be set");
  return url.replace(/\/$/, "");
}

async function callNotificationApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSsoToken();
  if (!token) throw new NotificationApiError(401, "Not authenticated");

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new NotificationApiError(res.status, `notifications ${path} -> ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  return callNotificationApi("/api/push-subscriptions");
}

export async function registerPushSubscription(input: {
  deviceId: string;
  platform: PushPlatform;
  endpoint?: string;
  p256dh?: string;
  auth?: string;
}): Promise<PushSubscriptionRecord> {
  return callNotificationApi("/api/push-subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function removePushSubscription(deviceId: string): Promise<void> {
  await callNotificationApi(`/api/push-subscriptions/${encodeURIComponent(deviceId)}`, { method: "DELETE" });
}
