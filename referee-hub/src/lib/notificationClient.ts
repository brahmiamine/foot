export async function getUnreadNotificationCount(token: string | null): Promise<number> {
  const baseUrl = process.env.NOTIFICATION_API_URL?.replace(/\/$/, "");
  if (!baseUrl || !token) return 0;
  try {
    const response = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return 0;
    const body = (await response.json()) as { count?: unknown };
    return typeof body.count === "number" ? body.count : 0;
  } catch {
    return 0;
  }
}
