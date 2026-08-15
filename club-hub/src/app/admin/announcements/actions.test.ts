import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  denied: false,
  create: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/access", () => ({
  getUserAccess: async () => ({ userId: "user-1", teamId: "team-1", isClubAdmin: false, permissions: new Set(), categories: "ALL" }),
  requirePermission: () => {
    if (state.denied) throw new Error("Action non autorisée : permission manquante");
  },
}));

vi.mock("@/services/AnnouncementService", () => ({
  AnnouncementService: class {
    create(...args: unknown[]) { return state.create(...args); }
    update(...args: unknown[]) { return state.update(...args); }
    setPublished(...args: unknown[]) { return state.publish(...args); }
    delete(...args: unknown[]) { return state.remove(...args); }
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

function form(contentHtml = "<p>Contenu</p>") {
  const value = new FormData();
  value.set("title", "Communiqué");
  value.set("contentHtml", contentHtml);
  value.set("category", "ANNONCE");
  return value;
}

beforeEach(() => {
  state.denied = false;
  state.create.mockReset().mockResolvedValue({ id: 1 });
  state.update.mockReset().mockResolvedValue({ id: 1 });
  state.publish.mockReset().mockResolvedValue(undefined);
  state.remove.mockReset().mockResolvedValue(undefined);
});

describe("announcement server actions authorization", () => {
  it("blocks create when announcements.manage is missing", async () => {
    state.denied = true;
    const { createAnnouncement } = await import("./actions");

    const result = await createAnnouncement(form());

    expect(result.success).toBe(false);
    expect(state.create).not.toHaveBeenCalled();
  });

  it("keeps legitimate create behavior and stores sanitized rich text", async () => {
    const { createAnnouncement } = await import("./actions");

    const result = await createAnnouncement(
      form('<p onclick="alert(1)">Texte</p><script>alert(2)</script>'),
    );

    expect(result.success).toBe(true);
    expect(state.create).toHaveBeenCalledWith(
      "team-1",
      expect.objectContaining({ contentHtml: expect.not.stringMatching(/onclick|<script/i) }),
    );
  });

  it("blocks publish/delete mutations when the permission is missing", async () => {
    state.denied = true;
    const { deleteAnnouncement, togglePublish } = await import("./actions");

    expect((await togglePublish(1, true)).success).toBe(false);
    expect((await deleteAnnouncement(1)).success).toBe(false);
    expect(state.publish).not.toHaveBeenCalled();
    expect(state.remove).not.toHaveBeenCalled();
  });
});
