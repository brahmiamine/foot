import { getSsoToken } from "@/lib/ssoSession";

export type NotificationChannel = "IN_APP" | "EMAIL" | "PUSH" | "SMS";
export type NotificationLocale = "fr" | "ar" | "en";
export type PushPlatform = "WEB" | "IOS" | "ANDROID";

export interface RemoteNotification {
  id: string;
  application: string;
  type: string;
  category: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  category: string;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface PushSubscriptionRecord {
  deviceId: string;
  platform: PushPlatform;
  createdAt: string;
}

/**
 * Client serveur-à-serveur vers notification-api : ob ne signe jamais de
 * requête en son nom, il relaie le JWT `sso` de l'utilisateur courant
 * (Authorization: Bearer, voir notification-api/src/auth/guards/jwt-auth.guard.ts).
 * N'écrit jamais dans la base `foot` partagée — un appel HTTP vers un autre
 * service, pas une écriture DB (voir README.md « Ce qui est branché »).
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
    throw new NotificationApiError(res.status, `notification-api ${path} -> ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchNotifications(page = 1, limit = 20): Promise<{ items: RemoteNotification[]; total: number }> {
  return callNotificationApi(`/api/notifications?page=${page}&limit=${limit}`);
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await callNotificationApi<{ count: number }>("/api/notifications/unread-count");
  return res.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await callNotificationApi(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await callNotificationApi("/api/notifications/read-all", { method: "PATCH" });
}

export async function fetchPreferences(): Promise<NotificationPreference[]> {
  return callNotificationApi("/api/preferences");
}

export async function upsertPreferences(
  entries: { category: string; channel: NotificationChannel; enabled: boolean }[],
): Promise<NotificationPreference[]> {
  return callNotificationApi("/api/preferences", {
    method: "PATCH",
    body: JSON.stringify({ preferences: entries }),
  });
}

export async function fetchLocale(): Promise<NotificationLocale> {
  const res = await callNotificationApi<{ locale: NotificationLocale }>("/api/preferences/locale");
  return res.locale;
}

export async function setLocale(locale: NotificationLocale): Promise<void> {
  await callNotificationApi("/api/preferences/locale", {
    method: "PATCH",
    body: JSON.stringify({ locale }),
  });
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
