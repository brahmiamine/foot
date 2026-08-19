import { beforeEach, describe, expect, it, vi } from "vitest";

const guard = vi.hoisted(() => vi.fn());
const getDataSource = vi.hoisted(() => vi.fn());

vi.mock("./ClubFeatureSettingsService", () => ({
  ClubFeatureSettingsService: class {
    assertEnabled = guard;
  },
}));
vi.mock("@/services/ClubFeatureSettingsService", () => ({
  ClubFeatureSettingsService: class {
    assertEnabled = guard;
  },
}));
vi.mock("@/lib/database", () => ({ getDataSource }));

import { AcademyService } from "./AcademyService";
import { RecruitmentService } from "./RecruitmentService";
import { SponsorService } from "./SponsorService";
import { TicketingService } from "./TicketingService";
import { listSellersForClub } from "@/lib/marketplaceApiClient";

beforeEach(() => {
  vi.clearAllMocks();
  guard.mockRejectedValue(new Error("feature disabled"));
});

describe("GOV-010 server feature boundaries", () => {
  it.each([
    ["ACADEMY", () => new AcademyService().findAllCategories("team-1")],
    ["RECRUITMENT", () => new RecruitmentService().findAllNeeds("team-1")],
    ["SPONSORING", () => new SponsorService().findAllSponsors("team-1")],
    ["TICKETING", () => new TicketingService().listCategories("team-1")],
  ])("blocks %s before any local database access", async (_feature, operation) => {
    await expect(operation()).rejects.toThrow("feature disabled");
    expect(getDataSource).not.toHaveBeenCalled();
  });

  it("blocks MARKETPLACE before any external HTTP call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(listSellersForClub("team-1")).rejects.toThrow("feature disabled");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
