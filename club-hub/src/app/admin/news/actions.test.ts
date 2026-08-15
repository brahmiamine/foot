import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { News } from "@/entities/News";
import { NotificationOutboxEvent } from "@/entities/NotificationOutboxEvent";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { Team } from "@/entities/Team";

let dataSource: DataSource;

const accessState = vi.hoisted(() => ({ denied: new Set<string>() }));

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

vi.mock("@/lib/access", () => ({
  getUserAccess: async () => ({
    userId: "user-1",
    teamId: "team-1",
    isClubAdmin: false,
    permissions: new Set<string>(),
    categories: "ALL",
  }),
  requirePermission: (_access: unknown, permission: string) => {
    if (accessState.denied.has(permission)) {
      throw new Error("Action non autorisée : permission manquante");
    }
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
}));

beforeEach(async () => {
  accessState.denied.clear();
  dataSource = await createTestDataSource();
  const teamRepo = dataSource.getRepository(Team);
  await teamRepo.save(
    teamRepo.create({
      id: "team-1",
      nom: "Club Test",
      teamType: "club",
      sport: "football",
      ageCategory: "seniors",
      gender: "male",
    }),
  );
});

afterEach(async () => {
  await dataSource.destroy();
  vi.restoreAllMocks();
});

function buildForm(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

describe("createNews", () => {
  it("enqueues exactly one outbox event when publishing a news article", async () => {
    const { createNews } = await import("./actions");

    const result = await createNews(
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }),
    );

    expect(result.success).toBe(true);
    const events = await dataSource.getRepository(NotificationOutboxEvent).find();
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({ type: "NEWS_PUBLISHED", teamId: "team-1" });
  });

  it("does not enqueue anything for a DRAFT article", async () => {
    const { createNews } = await import("./actions");
    await createNews(buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "DRAFT" }));
    expect(await dataSource.getRepository(NotificationOutboxEvent).find()).toHaveLength(0);
  });

  it("rolls back the News row if the outbox enqueue fails (atomicity)", async () => {
    vi.spyOn(NotificationOutboxService.prototype, "enqueue").mockRejectedValue(new Error("outbox insert failed"));
    const { createNews } = await import("./actions");

    const result = await createNews(
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }),
    );

    expect(result.success).toBe(false);
    expect(await dataSource.getRepository(News).find()).toHaveLength(0);
  });

  it("blocks creation when news.create is missing", async () => {
    accessState.denied.add("news.create");
    const { createNews } = await import("./actions");

    const result = await createNews(buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "DRAFT" }));

    expect(result.success).toBe(false);
    expect(await dataSource.getRepository(News).find()).toHaveLength(0);
  });

  it("blocks direct publication when news.publish is missing", async () => {
    accessState.denied.add("news.publish");
    const { createNews } = await import("./actions");

    const result = await createNews(
      buildForm({ title: "Titre", contentHtml: '<img src="x" onerror="alert(1)">', status: "PUBLISHED" }),
    );

    expect(result.success).toBe(false);
    expect(await dataSource.getRepository(News).find()).toHaveLength(0);
  });
});

describe("updateNews", () => {
  it("enqueues an outbox event only when the status transitions to PUBLISHED", async () => {
    const { createNews, updateNews } = await import("./actions");
    const created = await createNews(buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "DRAFT" }));
    expect(created.success, JSON.stringify(created)).toBe(true);

    await updateNews(created.id!, buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }));

    expect(await dataSource.getRepository(NotificationOutboxEvent).find()).toHaveLength(1);
  });

  it("does not enqueue again when the article was already PUBLISHED", async () => {
    const { createNews, updateNews } = await import("./actions");
    const created = await createNews(buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }));

    await updateNews(created.id!, buildForm({ title: "Titre modifié", contentHtml: "<p>x</p>", status: "PUBLISHED" }));

    expect(await dataSource.getRepository(NotificationOutboxEvent).find()).toHaveLength(1);
  });

  it("blocks a publication transition when news.publish is missing", async () => {
    const { createNews, updateNews } = await import("./actions");
    const created = await createNews(buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "DRAFT" }));
    accessState.denied.add("news.publish");

    const result = await updateNews(created.id!, buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }));

    expect(result.success).toBe(false);
    expect((await dataSource.getRepository(News).findOneByOrFail({ id: created.id! })).status).toBe("DRAFT");
  });
});
