import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { ClubApprovalRequest, ClubGovernanceSettings } from "@/entities/ClubGovernance";
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

async function enableAutomaticNewsPublication() {
  const repo = dataSource.getRepository(ClubGovernanceSettings);
  await repo.save(
    repo.create({
      teamId: "team-1",
      makerCheckerEnabled: true,
      newsApprovalMode: "AUTO",
      newsReapprovalOnSensitiveChange: true,
      announcementDefaultApprovalMode: "SINGLE_APPROVAL",
      announcementDecisionApprovalMode: "DUAL_APPROVAL",
      announcementSanctionApprovalMode: "DUAL_APPROVAL",
      announcementReapprovalOnSensitiveChange: true,
      shopProductApprovalMode: "SINGLE_APPROVAL",
      shopProductReapprovalOnSensitiveChange: true,
      version: 1,
      updatedBy: "admin-1",
    }),
  );
}

describe("createNews", () => {
  it("creates a draft plus one pending approval when publication requires review", async () => {
    const { createNews } = await import("./actions");

    const result = await createNews(
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }),
    );

    expect(result.success, JSON.stringify(result)).toBe(true);
    const news = await dataSource.getRepository(News).findOneByOrFail({ id: result.id! });
    expect(news).toMatchObject({ status: "DRAFT", isPublished: false });

    const requests = await dataSource.getRepository(ClubApprovalRequest).find();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      teamId: "team-1",
      domain: "NEWS",
      entityId: String(result.id),
      status: "PENDING",
      approvalMode: "SINGLE_APPROVAL",
      makerUserId: "user-1",
    });
    expect(await dataSource.getRepository(NotificationOutboxEvent).find()).toHaveLength(0);
  });

  it("publishes immediately and enqueues one event when the policy is AUTO", async () => {
    await enableAutomaticNewsPublication();
    const { createNews } = await import("./actions");

    const result = await createNews(
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }),
    );

    expect(result.success, JSON.stringify(result)).toBe(true);
    const news = await dataSource.getRepository(News).findOneByOrFail({ id: result.id! });
    expect(news).toMatchObject({ status: "PUBLISHED", isPublished: true });
    expect(await dataSource.getRepository(ClubApprovalRequest).find()).toHaveLength(0);

    const events = await dataSource.getRepository(NotificationOutboxEvent).find();
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({ type: "NEWS_PUBLISHED", teamId: "team-1" });
  });

  it("does not create an approval or outbox event for a DRAFT article", async () => {
    const { createNews } = await import("./actions");
    const result = await createNews(buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "DRAFT" }));

    expect(result.success, JSON.stringify(result)).toBe(true);
    expect(await dataSource.getRepository(ClubApprovalRequest).find()).toHaveLength(0);
    expect(await dataSource.getRepository(NotificationOutboxEvent).find()).toHaveLength(0);
  });

  it("keeps the draft but rolls back AUTO publication if outbox enqueue fails", async () => {
    await enableAutomaticNewsPublication();
    vi.spyOn(NotificationOutboxService.prototype, "enqueue").mockRejectedValue(new Error("outbox insert failed"));
    const { createNews } = await import("./actions");

    const result = await createNews(
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }),
    );

    expect(result.success).toBe(false);
    const rows = await dataSource.getRepository(News).find();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "DRAFT", isPublished: false });
    expect(await dataSource.getRepository(NotificationOutboxEvent).find()).toHaveLength(0);
  });

  it("blocks creation when news.create is missing", async () => {
    accessState.denied.add("news.create");
    const { createNews } = await import("./actions");

    const result = await createNews(buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "DRAFT" }));

    expect(result.success).toBe(false);
    expect(await dataSource.getRepository(News).find()).toHaveLength(0);
  });

  it("blocks a publication request when news.publish is missing", async () => {
    accessState.denied.add("news.publish");
    const { createNews } = await import("./actions");

    const result = await createNews(
      buildForm({ title: "Titre", contentHtml: '<img src="x" onerror="alert(1)">', status: "PUBLISHED" }),
    );

    expect(result.success).toBe(false);
    expect(await dataSource.getRepository(News).find()).toHaveLength(0);
    expect(await dataSource.getRepository(ClubApprovalRequest).find()).toHaveLength(0);
  });
});

describe("updateNews", () => {
  it("creates a pending approval instead of publishing directly", async () => {
    const { createNews, updateNews } = await import("./actions");
    const created = await createNews(buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "DRAFT" }));
    expect(created.success, JSON.stringify(created)).toBe(true);

    const result = await updateNews(
      created.id!,
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }),
    );

    expect(result.success, JSON.stringify(result)).toBe(true);
    expect(await dataSource.getRepository(NotificationOutboxEvent).find()).toHaveLength(0);
    expect(await dataSource.getRepository(ClubApprovalRequest).find()).toHaveLength(1);
    expect((await dataSource.getRepository(News).findOneByOrFail({ id: created.id! })).status).toBe("DRAFT");
  });

  it("does not enqueue again for a non-sensitive update of an AUTO-published article", async () => {
    await enableAutomaticNewsPublication();
    const { createNews, updateNews } = await import("./actions");
    const created = await createNews(buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }));
    expect(created.success, JSON.stringify(created)).toBe(true);

    const result = await updateNews(
      created.id!,
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }),
    );

    expect(result.success, JSON.stringify(result)).toBe(true);
    expect(await dataSource.getRepository(NotificationOutboxEvent).find()).toHaveLength(1);
    expect((await dataSource.getRepository(News).findOneByOrFail({ id: created.id! })).status).toBe("PUBLISHED");
  });

  it("blocks a publication transition when news.publish is missing", async () => {
    const { createNews, updateNews } = await import("./actions");
    const created = await createNews(buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "DRAFT" }));
    accessState.denied.add("news.publish");

    const result = await updateNews(
      created.id!,
      buildForm({ title: "Titre", contentHtml: "<p>x</p>", status: "PUBLISHED" }),
    );

    expect(result.success).toBe(false);
    expect((await dataSource.getRepository(News).findOneByOrFail({ id: created.id! })).status).toBe("DRAFT");
    expect(await dataSource.getRepository(ClubApprovalRequest).find()).toHaveLength(0);
  });
});