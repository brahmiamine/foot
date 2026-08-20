import { describe, expect, it } from "vitest";
import {
  LEGACY_DISCIPLINE_RULE,
  applyDisciplineOverride,
  resolveDisciplineRule,
  type DisciplineRuleCandidate,
} from "./disciplineRules";

const base = {
  teamId: "team-1",
  seasonId: "season-1",
  competitionType: "championnat" as const,
  category: "u17",
  at: new Date("2026-10-10T12:00:00.000Z"),
};

function candidate(
  patch: Partial<DisciplineRuleCandidate> = {},
): DisciplineRuleCandidate {
  return {
    id: "rule-1",
    teamId: "team-1",
    seasonId: null,
    competitionType: null,
    category: null,
    version: 1,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validUntil: null,
    yellowWarningThreshold: 2,
    yellowSuspensionThreshold: 3,
    yellowSuspensionMatches: 1,
    yellowFineAmount: 30,
    redFineAmount: 50,
    fineDueDays: 15,
    defaultRedSuspensionMatches: 1,
    defaultDoubleYellowSuspensionMatches: 1,
    ...patch,
  };
}

describe("resolveDisciplineRule", () => {
  it("preserves historical discipline behavior when no versioned rule exists", () => {
    expect(resolveDisciplineRule([], base)).toEqual({
      ...LEGACY_DISCIPLINE_RULE,
      source: "LEGACY",
      ruleSetId: null,
      version: 0,
    });
  });

  it("prefers the most specific effective rule for season, competition type and category", () => {
    const generic = candidate({ id: "generic", version: 7 });
    const season = candidate({ id: "season", seasonId: "season-1", version: 2 });
    const exact = candidate({
      id: "exact",
      seasonId: "season-1",
      competitionType: "championnat",
      category: "u17",
      version: 1,
      yellowSuspensionThreshold: 4,
    });

    const result = resolveDisciplineRule([generic, exact, season], base);

    expect(result.ruleSetId).toBe("exact");
    expect(result.yellowSuspensionThreshold).toBe(4);
  });

  it("ignores future and expired versions and uses the version effective at match time", () => {
    const expired = candidate({
      id: "expired",
      version: 1,
      validUntil: new Date("2026-06-01T00:00:00.000Z"),
      yellowFineAmount: 20,
    });
    const current = candidate({
      id: "current",
      version: 2,
      validFrom: new Date("2026-06-01T00:00:00.000Z"),
      yellowFineAmount: 35,
    });
    const future = candidate({
      id: "future",
      version: 3,
      validFrom: new Date("2027-01-01T00:00:00.000Z"),
      yellowFineAmount: 99,
    });

    expect(resolveDisciplineRule([expired, future, current], base).ruleSetId).toBe("current");
    expect(resolveDisciplineRule([expired, future, current], base).yellowFineAmount).toBe(35);
  });

  it("uses the latest version deterministically when specificity and window overlap", () => {
    const v1 = candidate({ id: "v1", version: 1, yellowFineAmount: 30 });
    const v2 = candidate({ id: "v2", version: 2, yellowFineAmount: 40 });

    expect(resolveDisciplineRule([v1, v2], base).ruleSetId).toBe("v2");
  });
});

describe("applyDisciplineOverride", () => {
  it("applies an active audited override without mutating the resolved base rule", () => {
    const resolved = resolveDisciplineRule([candidate()], base);
    const overridden = applyDisciplineOverride(resolved, {
      id: "override-1",
      reason: "Décision exceptionnelle référencée PV-2026-42",
      validFrom: new Date("2026-10-01T00:00:00.000Z"),
      validUntil: new Date("2026-10-20T00:00:00.000Z"),
      revokedAt: null,
      values: { yellowSuspensionThreshold: 4, yellowFineAmount: 0 },
    }, base.at);

    expect(resolved.yellowSuspensionThreshold).toBe(3);
    expect(overridden.yellowSuspensionThreshold).toBe(4);
    expect(overridden.yellowFineAmount).toBe(0);
    expect(overridden.overrideId).toBe("override-1");
  });

  it("ignores expired or revoked overrides", () => {
    const resolved = resolveDisciplineRule([candidate()], base);
    const expired = applyDisciplineOverride(resolved, {
      id: "expired",
      reason: "ancienne décision",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validUntil: new Date("2026-02-01T00:00:00.000Z"),
      revokedAt: null,
      values: { yellowSuspensionThreshold: 9 },
    }, base.at);
    const revoked = applyDisciplineOverride(resolved, {
      id: "revoked",
      reason: "décision retirée",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validUntil: null,
      revokedAt: new Date("2026-05-01T00:00:00.000Z"),
      values: { yellowSuspensionThreshold: 9 },
    }, base.at);

    expect(expired.overrideId).toBeNull();
    expect(revoked.overrideId).toBeNull();
    expect(expired.yellowSuspensionThreshold).toBe(3);
  });
});
