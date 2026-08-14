import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { News } from "@/entities/News";
import { NotificationOutboxEvent } from "@/entities/NotificationOutboxEvent";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { Team } from "@/entities/Team";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

vi.mock("@/lib/team-context", () => ({
  requireTeamId: async () => "team-1",
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
}));

beforeEach(async () => {
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

/** TS-25 (Epic E07) — createNews/updateNews mettent l'écriture News et l'outbox dans la même transaction. */
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

    const events = await dataSource.getRepository(NotificationOutboxEvent).find();
    expect(events).toHaveLength(0);
  });

  it("rolls back the News row if the outbox enqueue fails (atomicity)", async () => {
    vi.spyOn(NotificationOutboxService.prototype, "enqueue").mockRejectedValue(
      new Error("outbox insert failed"),
    );
    const { createNews } = await import("./actions");

    const result = await createNews(
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }),
    );

    expect(result.success).toBe(false);
    const news = await dataSource.getRepository(News).find();
    expect(news).toHaveLength(0);
  });
});

describe("updateNews", () => {
  it("enqueues an outbox event only when the status transitions to PUBLISHED", async () => {
    const { createNews, updateNews } = await import("./actions");
    const created = await createNews(
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "DRAFT" }),
    );
    expect(created.success, JSON.stringify(created)).toBe(true);

    await updateNews(created.id!, buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }));

    const events = await dataSource.getRepository(NotificationOutboxEvent).find();
    expect(events).toHaveLength(1);
  });

  it("does not enqueue again when the article was already PUBLISHED", async () => {
    const { createNews, updateNews } = await import("./actions");
    const created = await createNews(
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }),
    );

    await updateNews(created.id!, buildForm({ title: "Titre modifié", contentHtml: "<p>x</p>", status: "PUBLISHED" }));

    const events = await dataSource.getRepository(NotificationOutboxEvent).find();
    expect(events).toHaveLength(1);
  });
});
