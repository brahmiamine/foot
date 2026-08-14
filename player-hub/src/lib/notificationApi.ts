import { getSsoToken } from "./ssoSession";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: NotificationPriority;
  readAt: string | null;
  createdAt: string;
}

/**
 * Client vers l'app `notifications` — relaie le JWT `sso` du joueur connecté
 * (Authorization: Bearer, voir notifications/src/auth/guards/jwt-auth.guard.ts),
 * jamais de clé de service ici (même convention que
 * club-hub/src/lib/notificationApi.ts, mais player-hub n'a besoin que de la
 * liste/lecture des notifications, pas des abonnements push).
 */
class NotificationApiError extends Error {
  constructor(
    public status: number,
    message: string
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

export async function fetchNotifications(): Promise<NotificationRecord[]> {
  try {
    return await callNotificationApi<NotificationRecord[]>("/api/notifications");
  } catch {
    return [];
  }
}

export async function fetchUnreadCount(): Promise<number> {
  try {
    const res = await callNotificationApi<{ count: number }>("/api/notifications/unread-count");
    return res.count;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await callNotificationApi(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await callNotificationApi("/api/notifications/read-all", { method: "PATCH" });
}
