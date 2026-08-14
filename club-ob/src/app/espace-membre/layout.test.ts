import { afterEach, describe, expect, it, vi } from "vitest";

const getSsoSession = vi.fn();
const buildMemberLoginUrlForPath = vi.fn();
vi.mock("@/lib/ssoSession", () => ({
  getSsoSession: (...args: unknown[]) => getSsoSession(...args),
  buildMemberLoginUrlForPath: (...args: unknown[]) => buildMemberLoginUrlForPath(...args),
}));

const fetchUnreadCount = vi.fn();
vi.mock("@/lib/notificationApi", () => ({
  fetchUnreadCount: (...args: unknown[]) => fetchUnreadCount(...args),
}));

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirect(...(args as [string])),
}));

vi.mock("@/i18n/server", () => ({
  getTranslator: async () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/PageChrome", () => ({ PageChrome: (props: { children: unknown }) => props.children }));
vi.mock("@/components/MemberTabs", () => ({ MemberTabs: () => null }));

afterEach(() => {
  vi.resetAllMocks();
});

/** TS-36 — restrictions membre : /espace-membre/* exige une session SSO MEMBER. */
describe("EspaceMembreLayout", () => {
  it("redirects to the member login when there is no SSO session", async () => {
    getSsoSession.mockResolvedValue(null);
    buildMemberLoginUrlForPath.mockResolvedValue("http://localhost/membre/login?redirect=/espace-membre");
    const { default: EspaceMembreLayout } = await import("./layout");

    await expect(EspaceMembreLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("http://localhost/membre/login?redirect=/espace-membre");
    expect(fetchUnreadCount).not.toHaveBeenCalled();
  });

  it("renders for an authenticated member without redirecting", async () => {
    getSsoSession.mockResolvedValue({ id: "user-1", name: "Amal", email: "amal@example.com", role: "MEMBER" });
    fetchUnreadCount.mockResolvedValue(2);
    const { default: EspaceMembreLayout } = await import("./layout");

    await expect(EspaceMembreLayout({ children: null })).resolves.toBeTruthy();

    expect(redirect).not.toHaveBeenCalled();
  });

  it("still renders when notifications is unavailable (unread count best-effort)", async () => {
    getSsoSession.mockResolvedValue({ id: "user-1", name: "Amal", email: "amal@example.com", role: "MEMBER" });
    fetchUnreadCount.mockRejectedValue(new Error("notifications down"));
    const { default: EspaceMembreLayout } = await import("./layout");

    await expect(EspaceMembreLayout({ children: null })).resolves.toBeTruthy();
  });
});
