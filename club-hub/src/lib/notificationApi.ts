import { getSsoToken } from "@/lib/ssoSession";
import type { ResolvedPolicy } from "../../../packages/domain-contracts/src/policy";

export type PushPlatform = "WEB" | "IOS" | "ANDROID";

export interface PushSubscriptionRecord {
  deviceId: string;
  platform: PushPlatform;
  createdAt: string;
}

export type NotificationChannelPolicyValue = "MANDATORY" | "DEFAULT" | "DISABLED";

export interface NotificationPolicySummary {
  id: string;
  scopeType: "PLATFORM" | "CLUB";
  scopeId: string | null;
  category: string | null;
  version: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
}

export type EffectiveNotificationPolicy = ResolvedPolicy<
  Record<string, NotificationChannelPolicyValue>
>;

/**
 * Client serveur-à-serveur vers notifications pour la gestion de
 * l'abonnement Web Push du compte connecté et la lecture de gouvernance
 * effective. club-hub ne signe jamais de requête en son nom : il relaie le
 * JWT `sso` de l'utilisateur courant (Authorization: Bearer).
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

/** GOV-006 : catalogue visible pour le club courant (PLATFORM + son CLUB). */
export async function fetchNotificationPolicies(): Promise<NotificationPolicySummary[]> {
  return callNotificationApi("/admin/notification-policies");
}

/**
 * GOV-006 : policy de notification réellement appliquée au club courant,
 * avec provenance par canal. `category=null` demande explicitement le
 * fallback organisationnel (`category IS NULL`).
 */
export async function fetchEffectiveNotificationPolicy(
  category: string | null,
  at: Date,
): Promise<EffectiveNotificationPolicy> {
  const query = new URLSearchParams({ at: at.toISOString() });
  if (category) query.set("category", category);
  return callNotificationApi(`/admin/notification-policies/effective?${query.toString()}`);
}
