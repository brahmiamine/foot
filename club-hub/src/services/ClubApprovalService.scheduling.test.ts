import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelectQueryBuilder, type DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { ClubGovernanceSettings } from "@/entities/ClubGovernance";
import { News } from "@/entities/News";
import { NotificationOutboxEvent } from "@/entities/NotificationOutboxEvent";
import { Team } from "@/entities/Team";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

beforeEach(async () => {
  // Production uses MySQL/MariaDB, where the scheduler deliberately takes a
  // pessimistic write lock. The integration datasource is SQLite, which does
  // not implement SELECT ... FOR UPDATE; neutralize only that driver-specific
  // primitive while keeping the transaction and all business assertions real.
  vi.spyOn(SelectQueryBuilder.prototype, "setLock").mockReturnThis();

  dataSource = await createTestDataSource();
  await dataSource.getRepository(Team).save(
    dataSource.getRepository(Team).create({
      id: "team-1",
      nom: "Club Test",
      teamType: "club",
      sport: "football",
      ageCategory: "seniors",
      gender: "male",
    }),
  );
  await dataSource.getRepository(ClubGovernanceSettings).save(
    dataSource.getRepository(ClubGovernanceSettings).create({
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
});

afterEach(async () => {
  await dataSource.destroy();
  vi.restoreAllMocks();
});

describe("scheduled News publication", () => {
  it("keeps approved future content private until due and publishes it once", async () => {
    const { ClubApprovalService } = await import("./ClubApprovalService");
    const service = new ClubApprovalService();
    const scheduledAt = new Date(Date.now() + 60_000);
    const newsRepo = dataSource.getRepository(News);
    const news = await newsRepo.save(
      newsRepo.create({
        teamId: "team-1",
        title: "Actualité planifiée",
        contentHtml: "<p>Contenu</p>",
        status: "DRAFT",
        editorialStatus: "DRAFT",
        isPublished: false,
        publishedAt: null,
        scheduledAt,
      }),
    );

    const submission = await service.submitPublication("NEWS", String(news.id), "team-1", "admin-1");
    expect(submission).toMatchObject({ published: false, request: null });

    const scheduled = await newsRepo.findOneByOrFail({ id: news.id });
    expect(scheduled).toMatchObject({
      status: "DRAFT",
      editorialStatus: "SCHEDULED",
      isPublished: false,
      publishedAt: null,
    });
    expect(await dataSource.getRepository(NotificationOutboxEvent).count()).toBe(0);

    await expect(service.processScheduledNewsDue(new Date(scheduledAt.getTime() - 1))).resolves.toEqual({
      processed: 0,
      publishedIds: [],
    });

    const first = await service.processScheduledNewsDue(new Date(scheduledAt.getTime() + 1));
    expect(first).toEqual({ processed: 1, publishedIds: [news.id] });
    const published = await newsRepo.findOneByOrFail({ id: news.id });
    expect(published.status).toBe("PUBLISHED");
    expect(published.editorialStatus).toBe("PUBLISHED");
    expect(published.isPublished).toBe(true);
    expect(published.publishedAt).toBeInstanceOf(Date);
    expect(await dataSource.getRepository(NotificationOutboxEvent).count()).toBe(1);

    await expect(service.processScheduledNewsDue(new Date(scheduledAt.getTime() + 60_000))).resolves.toEqual({
      processed: 0,
      publishedIds: [],
    });
    expect(await dataSource.getRepository(NotificationOutboxEvent).count()).toBe(1);
  });
});
