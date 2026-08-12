import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSsoToken = vi.fn();
vi.mock("@/lib/ssoSession", () => ({
  getSsoToken: (...args: unknown[]) => getSsoToken(...args),
}));

const envBackup = { ...process.env };

beforeEach(() => {
  process.env.NOTIFICATION_API_URL = "http://notification-api.internal";
  getSsoToken.mockResolvedValue("sso-token-1");
});

afterEach(() => {
  process.env = { ...envBackup };
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

/** TS-36 — notification actions (relais HTTP vers notification-api). */
describe("notificationApi", () => {
  it("throws 401 without ever calling notification-api when there is no SSO session", async () => {
    getSsoToken.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { fetchUnreadCount } = await import("./notificationApi");

    await expect(fetchUnreadCount()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("relays the SSO token as Bearer auth and returns the unread count", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ count: 3 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { fetchUnreadCount } = await import("./notificationApi");

    const count = await fetchUnreadCount();

    expect(count).toBe(3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://notification-api.internal/api/notifications/unread-count");
    expect(init.headers.Authorization).toBe("Bearer sso-token-1");
  });

  it("marks a single notification as read via PATCH", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);
    const { markNotificationRead } = await import("./notificationApi");

    await markNotificationRead("notif-1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://notification-api.internal/api/notifications/notif-1/read");
    expect(init.method).toBe("PATCH");
  });

  it("propagates a non-2xx response as an error carrying the status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);
    const { fetchUnreadCount } = await import("./notificationApi");

    await expect(fetchUnreadCount()).rejects.toMatchObject({ status: 503 });
  });

  it("registers a push subscription with a JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ deviceId: "device-1", platform: "WEB", createdAt: "2026-01-01" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { registerPushSubscription } = await import("./notificationApi");

    const result = await registerPushSubscription({ deviceId: "device-1", platform: "WEB" });

    expect(result.deviceId).toBe("device-1");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ deviceId: "device-1", platform: "WEB" });
  });
});
