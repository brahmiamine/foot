import { describe, expect, it, vi } from "vitest";
import type { Match } from "@/entities/Match";
import type { MatchOfficialAssignment } from "@/entities/MatchOfficialAssignment";
import {
  MATCH_OPERATIONS_ACCESS_PERMISSION,
  MATCH_OPERATIONS_SIGN_PERMISSION,
  MatchAccessDeniedError,
  MatchAccessService,
  type ClubRbacReader,
  type MatchLookup,
  type OfficialAssignmentLookup,
  type PermissionScope,
} from "./MatchAccessService";

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: "match-1",
    journeeId: "j1",
    equipeHome: "club-1",
    equipeAway: "club-2",
    date: new Date("2026-08-20T18:00:00Z"),
    status: "UPCOMING",
    illegalPlayerUsed: false,
    isPublicVisible: true,
    createdAt: new Date(),
    homeTeam: { id: "club-1", nom: "OB", ageCategory: "seniors" } as Match["homeTeam"],
    awayTeam: { id: "club-2", nom: "EST", ageCategory: "seniors" } as Match["awayTeam"],
    ...overrides,
  } as Match;
}

function dependencies(options?: {
  accessScope?: PermissionScope;
  signScope?: PermissionScope;
  clubMatches?: Match[];
  refereeMatches?: Match[];
  assignment?: MatchOfficialAssignment | null;
}) {
  const rbac: ClubRbacReader = {
    getPermissionScope: vi.fn().mockImplementation(async (_teamId, _userId, permission) => {
      if (permission === MATCH_OPERATIONS_ACCESS_PERMISSION) return options?.accessScope ?? null;
      if (permission === MATCH_OPERATIONS_SIGN_PERMISSION) return options?.signScope ?? null;
      return null;
    }),
  };
  const matches: MatchLookup = {
    findById: vi.fn().mockResolvedValue(match()),
    findForClub: vi.fn().mockResolvedValue(options?.clubMatches ?? [match()]),
  };
  const assignments: OfficialAssignmentLookup = {
    findActiveAssignment: vi.fn().mockResolvedValue(options?.assignment ?? null),
    listActiveCenterRefereeMatches: vi.fn().mockResolvedValue(options?.refereeMatches ?? [match()]),
  };
  return { rbac, matches, assignments };
}

describe("MatchAccessService", () => {
  it("refuse la liste des matchs à un CLUB_STAFF sans matchOperations.access", async () => {
    const deps = dependencies({ accessScope: null });
    const service = new MatchAccessService(deps.rbac, deps.matches, deps.assignments);

    await expect(
      service.listAccessibleMatches({ userId: "user-1", role: "CLUB_STAFF", teamId: "club-1" }),
    ).resolves.toEqual([]);
    expect(deps.matches.findForClub).not.toHaveBeenCalled();
  });

  it("transmet les catégories autorisées par matchOperations.access au filtrage des matchs", async () => {
    const deps = dependencies({ accessScope: ["u17"] });
    const service = new MatchAccessService(deps.rbac, deps.matches, deps.assignments);

    await service.listAccessibleMatches({ userId: "coach-u17", role: "CLUB_STAFF", teamId: "club-1" });

    expect(deps.matches.findForClub).toHaveBeenCalledWith("club-1", ["u17"], 20);
  });

  it("donne l'accès club complet à CLUB_ADMIN selon la convention Club Hub", async () => {
    const deps = dependencies();
    const service = new MatchAccessService(deps.rbac, deps.matches, deps.assignments);

    await service.listAccessibleMatches({ userId: "admin-1", role: "CLUB_ADMIN", teamId: "club-1" });

    expect(deps.rbac.getPermissionScope).not.toHaveBeenCalled();
    expect(deps.matches.findForClub).toHaveBeenCalledWith("club-1", "ALL", 20);
  });

  it("liste pour REFEREE uniquement les matchs où il est arbitre central actif", async () => {
    const deps = dependencies({ refereeMatches: [match({ id: "central-match" })] });
    const service = new MatchAccessService(deps.rbac, deps.matches, deps.assignments);

    const result = await service.listAccessibleMatches({ userId: "ref-1", role: "REFEREE", teamId: null });

    expect(result.map((item) => item.id)).toEqual(["central-match"]);
    expect(deps.assignments.listActiveCenterRefereeMatches).toHaveBeenCalledWith("ref-1", 20);
  });

  it("autorise un représentant domicile à signer uniquement TEAM_HOME avec matchOperations.sign", async () => {
    const deps = dependencies({ accessScope: ["seniors"], signScope: ["seniors"] });
    const service = new MatchAccessService(deps.rbac, deps.matches, deps.assignments);

    await expect(
      service.assertSignatureActor(
        { userId: "coach-1", role: "CLUB_STAFF", teamId: "club-1" },
        "match-1",
        "TEAM_HOME",
      ),
    ).resolves.toBeUndefined();

    await expect(
      service.assertSignatureActor(
        { userId: "coach-1", role: "CLUB_STAFF", teamId: "club-1" },
        "match-1",
        "TEAM_AWAY",
      ),
    ).rejects.toBeInstanceOf(MatchAccessDeniedError);
  });

  it("refuse la signature club quand le rôle peut consulter mais pas signer", async () => {
    const deps = dependencies({ accessScope: ["seniors"], signScope: null });
    const service = new MatchAccessService(deps.rbac, deps.matches, deps.assignments);

    await expect(
      service.assertSignatureActor(
        { userId: "viewer-1", role: "CLUB_STAFF", teamId: "club-1" },
        "match-1",
        "TEAM_HOME",
      ),
    ).rejects.toBeInstanceOf(MatchAccessDeniedError);
  });

  it("autorise REFEREE à signer uniquement s'il possède une affectation ACTIVE CENTER_REFEREE", async () => {
    const centralAssignment = {
      id: 1,
      matchId: "match-1",
      userId: "ref-1",
      role: "CENTER_REFEREE",
      status: "ACTIVE",
      assignedAt: new Date(),
    } as MatchOfficialAssignment;
    const deps = dependencies({ assignment: centralAssignment });
    const service = new MatchAccessService(deps.rbac, deps.matches, deps.assignments);

    await expect(
      service.assertSignatureActor({ userId: "ref-1", role: "REFEREE", teamId: null }, "match-1", "REFEREE"),
    ).resolves.toBeUndefined();

    await expect(
      service.assertSignatureActor({ userId: "ref-1", role: "REFEREE", teamId: null }, "match-1", "TEAM_HOME"),
    ).rejects.toBeInstanceOf(MatchAccessDeniedError);
  });
});
