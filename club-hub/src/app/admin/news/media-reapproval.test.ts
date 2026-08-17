import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { ClubApprovalRequest } from "@/entities/ClubGovernance";
import { MediaItem } from "@/entities/MediaItem";
import { News } from "@/entities/News";
import { NewsMedia } from "@/entities/NewsMedia";
import { Team } from "@/entities/Team";

let dataSource: DataSource;

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
  requirePermission: () => undefined,
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
}));

beforeEach(async () => {
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
});

afterEach(async () => {
  await dataSource.destroy();
  vi.restoreAllMocks();
});

describe("scheduled News media governance", () => {
  it("invalidates the scheduled approval after a media addition", async () => {
    const scheduledAt = new Date(Date.now() + 60_000);
    const newsRepo = dataSource.getRepository(News);
    const news = await newsRepo.save(
      newsRepo.create({
        teamId: "team-1",
        title: "Actualité planifiée",
        contentHtml: "<p>Contenu</p>",
        status: "DRAFT",
        editorialStatus: "SCHEDULED",
        isPublished: false,
        publishedAt: null,
        scheduledAt,
      }),
    );
    const mediaRepo = dataSource.getRepository(MediaItem);
    const media = await mediaRepo.save(
      mediaRepo.create({
        teamId: "team-1",
        url: "https://cdn.example.test/news/photo.jpg",
        type: "IMAGE",
      }),
    );

    const { addMediaToNews } = await import("./actions");
    const result = await addMediaToNews(news.id, media.id, 0);

    expect(result.success, JSON.stringify(result)).toBe(true);
    expect(await dataSource.getRepository(NewsMedia).count()).toBe(1);

    const refreshed = await newsRepo.findOneByOrFail({ id: news.id });
    expect(refreshed).toMatchObject({
      status: "DRAFT",
      editorialStatus: "UNDER_REVIEW",
      isPublished: false,
    });
    expect(refreshed.scheduledAt?.getTime()).toBe(scheduledAt.getTime());

    const requests = await dataSource.getRepository(ClubApprovalRequest).find();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      domain: "NEWS",
      entityId: String(news.id),
      status: "PENDING",
    });
  });
});
