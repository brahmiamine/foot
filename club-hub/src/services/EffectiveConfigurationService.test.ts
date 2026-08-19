import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolvePublicContent: vi.fn(),
  resolvePublicForm: vi.fn(),
  fetchNotificationPolicies: vi.fn(),
  fetchEffectiveNotificationPolicy: vi.fn(),
}));

vi.mock("@/entities/PublicFormSettings", () => ({
  PUBLIC_FORM_DOMAINS: ["CONTACT"],
}));

vi.mock("@/services/PublicContentPolicyService", () => ({
  PublicContentPolicyService: class {
    resolveExplained = mocks.resolvePublicContent;
  },
}));

vi.mock("@/services/PublicFormSettingsService", () => ({
  PublicFormSettingsService: class {
    getExplained = mocks.resolvePublicForm;
  },
}));

vi.mock("@/lib/notificationApi", () => ({
  fetchNotificationPolicies: mocks.fetchNotificationPolicies,
  fetchEffectiveNotificationPolicy: mocks.fetchEffectiveNotificationPolicy,
}));

import { EffectiveConfigurationService } from "./EffectiveConfigurationService";

function defaults(values: Record<string, unknown>) {
  return {
    values,
    sources: Object.fromEntries(
      Object.keys(values).map((key) => [key, { kind: "DEFAULT" as const }]),
    ),
    appliedRecords: [],
  };
}

describe("EffectiveConfigurationService (GOV-006)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePublicContent.mockResolvedValue(defaults({ NEWS: true }));
    mocks.resolvePublicForm.mockResolvedValue(defaults({ isOpen: true }));
    mocks.fetchNotificationPolicies.mockResolvedValue([
      { category: null },
      { category: "MARKETING" },
      { category: "MARKETING" },
    ]);
    mocks.fetchEffectiveNotificationPolicy.mockImplementation(
      async (category: string | null) =>
        category === "MARKETING"
          ? {
              values: { EMAIL: "MANDATORY", SMS: "DISABLED" },
              sources: {
                EMAIL: {
                  kind: "POLICY",
                  recordId: "club-marketing-1",
                  scopeType: "CLUB",
                  scopeId: "team-1",
                  version: 2,
                  effectiveFrom: "2026-08-10T00:00:00.000Z",
                  effectiveUntil: null,
                },
                SMS: {
                  kind: "POLICY",
                  recordId: "platform-marketing-1",
                  scopeType: "PLATFORM",
                  scopeId: null,
                  version: 1,
                  effectiveFrom: "2026-08-01T00:00:00.000Z",
                  effectiveUntil: null,
                },
              },
              appliedRecords: [
                {
                  id: "platform-marketing-1",
                  scopeType: "PLATFORM",
                  scopeId: null,
                  version: 1,
                },
                {
                  id: "club-marketing-1",
                  scopeType: "CLUB",
                  scopeId: "team-1",
                  version: 2,
                },
              ],
            }
          : defaults({ EMAIL: "DEFAULT", SMS: "DEFAULT" }),
    );
  });

  it("aggregates notification fallback and configured categories with exact provenance", async () => {
    const sections = await new EffectiveConfigurationService().resolveForTeam(
      "team-1",
      new Date("2026-08-19T10:00:00Z"),
    );

    expect(sections.map((section) => section.domain)).toEqual([
      "CLUB_PUBLIC_CONTENT",
      "CLUB_PUBLIC_FORM_CONTACT",
      "NOTIFICATION_POLICY_DEFAULT",
      "NOTIFICATION_POLICY_MARKETING",
    ]);
    expect(mocks.fetchEffectiveNotificationPolicy).toHaveBeenCalledTimes(2);
    expect(mocks.fetchEffectiveNotificationPolicy).toHaveBeenNthCalledWith(
      1,
      null,
      new Date("2026-08-19T10:00:00Z"),
    );
    expect(mocks.fetchEffectiveNotificationPolicy).toHaveBeenNthCalledWith(
      2,
      "MARKETING",
      new Date("2026-08-19T10:00:00Z"),
    );

    const marketing = sections.find(
      (section) => section.domain === "NOTIFICATION_POLICY_MARKETING",
    );
    expect(
      marketing?.entries.find((entry) => entry.key === "EMAIL")?.source,
    ).toMatchObject({
      kind: "POLICY",
      scopeType: "CLUB",
      scopeId: "team-1",
      version: 2,
    });
    expect(
      marketing?.entries.find((entry) => entry.key === "SMS")?.source,
    ).toMatchObject({
      kind: "POLICY",
      scopeType: "PLATFORM",
      version: 1,
    });
  });
});
