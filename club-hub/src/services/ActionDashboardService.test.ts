import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClubApprovalRequest } from "@/entities/ClubGovernance";
import type { UserAccess } from "@/lib/access";

const mocks = vi.hoisted(() => ({
  listPending: vi.fn(),
  news: vi.fn(),
  announcement: vi.fn(),
  product: vi.fn(),
}));

vi.mock("@/services/ClubApprovalService", () => ({
  ClubApprovalService: class {
    listPending = mocks.listPending;
  },
}));
vi.mock("@/services/NewsService", () => ({ NewsService: class { findById = mocks.news; } }));
vi.mock("@/services/AnnouncementService", () => ({ AnnouncementService: class { findById = mocks.announcement; } }));
vi.mock("@/services/ProductService", () => ({ ProductService: class { findById = mocks.product; } }));

import { ActionDashboardService } from "./ActionDashboardService";

function request(values: Partial<ClubApprovalRequest>): ClubApprovalRequest {
  return {
    id: "request-1",
    teamId: "team-1",
    domain: "NEWS",
    entityId: "1",
    action: "PUBLISH",
    makerUserId: "maker-1",
    makerCheckerEnabled: true,
    approvalMode: "SINGLE_APPROVAL",
    requiredApprovals: 1,
    contentFingerprint: "abc",
    status: "PENDING",
    createdAt: new Date("2026-08-19T10:00:00Z"),
    updatedAt: new Date("2026-08-19T10:00:00Z"),
    ...values,
  };
}

const access: UserAccess = {
  userId: "reviewer-1",
  teamId: "team-1",
  isClubAdmin: false,
  permissions: new Set(["news.publish"]),
  categories: "ALL",
};

describe("ActionDashboardService Club Hub (GOV-009)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.news.mockResolvedValue({ title: "Actualité à valider" });
    mocks.announcement.mockResolvedValue({ title: "Communiqué" });
    mocks.product.mockResolvedValue({ nameFr: "Maillot" });
  });

  it("returns only approvals the current user can actually decide", async () => {
    mocks.listPending.mockResolvedValue([
      request({ id: "news-ok", domain: "NEWS", makerUserId: "maker-2" }),
      request({ id: "own-news", domain: "NEWS", makerUserId: "reviewer-1", makerCheckerEnabled: true }),
      request({ id: "announcement-no-permission", domain: "ANNOUNCEMENT", entityId: "2", makerUserId: "maker-2" }),
    ]);

    const items = await new ActionDashboardService().listForUser("team-1", access);

    expect(mocks.listPending).toHaveBeenCalledWith("team-1");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "club-approval:news-ok",
      domain: "CLUB_APPROVAL",
      entityId: "1",
      title: "Actualité à valider",
      href: "/admin/approvals",
      scope: { teamId: "team-1" },
    });
  });

  it("allows the maker when the request snapshot explicitly disables maker/checker", async () => {
    mocks.listPending.mockResolvedValue([
      request({ id: "legacy-own", makerUserId: "reviewer-1", makerCheckerEnabled: false }),
    ]);

    const items = await new ActionDashboardService().listForUser("team-1", access);
    expect(items).toHaveLength(1);
  });
});
