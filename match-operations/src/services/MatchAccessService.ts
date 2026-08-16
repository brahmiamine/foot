import type { ActorRole } from "@/entities/Signature";
import type { Match } from "@/entities/Match";
import type { MatchOfficialAssignment } from "@/entities/MatchOfficialAssignment";
import type {
  ClubPermissionScope,
  ClubPermissionScopeReadPort,
} from "../../../packages/domain-contracts/src/club-access";
import { normalizeRole } from "../../../packages/auth-shared/src/roles";
import { SharedDatabaseClubPermissionScopeAdapter } from "@/adapters/club/SharedDatabaseClubPermissionScopeAdapter";
import { MatchService } from "./MatchService";
import { MatchOfficialAssignmentService } from "./MatchOfficialAssignmentService";

export const MATCH_OPERATIONS_ACCESS_PERMISSION = "matchOperations.access";
export const MATCH_OPERATIONS_SIGN_PERMISSION = "matchOperations.sign";

export type PermissionScope = ClubPermissionScope;
export type ClubRbacReader = ClubPermissionScopeReadPort;

export interface MatchActorSession {
  userId: string;
  role: string;
  teamId: string | null;
}

export interface MatchLookup {
  findById(id: string): Promise<Match | null>;
  findForClub(teamId: string, categories: "ALL" | string[], limit?: number): Promise<Match[]>;
}

export interface OfficialAssignmentLookup {
  findActiveAssignment(
    userId: string,
    matchId: string,
    role?: MatchOfficialAssignment["role"],
  ): Promise<MatchOfficialAssignment | null>;
  listActiveCenterRefereeMatches(userId: string, limit?: number): Promise<Match[]>;
}

export class MatchAccessDeniedError extends Error {
  constructor(message = "Accès à la feuille de match non autorisé") {
    super(message);
    this.name = "MatchAccessDeniedError";
  }
}

function scopeAllowsCategory(scope: PermissionScope, category: string | null | undefined): boolean {
  if (scope === "ALL") return true;
  if (!scope || !category) return false;
  return scope.includes(category);
}

function clubCategoryForMatch(match: Match, teamId: string): string | null {
  if (match.equipeHome === teamId) return match.homeTeam?.ageCategory ?? null;
  if (match.equipeAway === teamId) return match.awayTeam?.ageCategory ?? null;
  return null;
}

export class MatchAccessService {
  constructor(
    private readonly clubRbac: ClubRbacReader = new SharedDatabaseClubPermissionScopeAdapter(),
    private readonly matches: MatchLookup = new MatchService(),
    private readonly assignments: OfficialAssignmentLookup = new MatchOfficialAssignmentService(),
  ) {}

  async listAccessibleMatches(session: MatchActorSession, limit = 20): Promise<Match[]> {
    const role = normalizeRole(session.role);

    if (role === "REFEREE" && !session.teamId) {
      return this.assignments.listActiveCenterRefereeMatches(session.userId, limit);
    }

    if (!session.teamId || (role !== "CLUB_ADMIN" && role !== "CLUB_STAFF")) {
      return [];
    }

    if (role === "CLUB_ADMIN") {
      return this.matches.findForClub(session.teamId, "ALL", limit);
    }

    const scope = await this.clubRbac.getPermissionScope({
      teamId: session.teamId,
      userId: session.userId,
      permission: MATCH_OPERATIONS_ACCESS_PERMISSION,
    });
    if (!scope) return [];

    return this.matches.findForClub(session.teamId, scope, limit);
  }

  async assertMatchAccess(session: MatchActorSession, matchId: string): Promise<void> {
    const match = await this.matches.findById(matchId);
    if (!match) throw new MatchAccessDeniedError("Match introuvable ou inaccessible");

    const role = normalizeRole(session.role);
    if (role === "REFEREE" && !session.teamId) {
      const assignment = await this.assignments.findActiveAssignment(session.userId, matchId, "CENTER_REFEREE");
      if (!assignment) throw new MatchAccessDeniedError();
      return;
    }

    if (!session.teamId || (role !== "CLUB_ADMIN" && role !== "CLUB_STAFF")) {
      throw new MatchAccessDeniedError();
    }

    const category = clubCategoryForMatch(match, session.teamId);
    if (!category) throw new MatchAccessDeniedError();

    if (role === "CLUB_ADMIN") return;

    const scope = await this.clubRbac.getPermissionScope({
      teamId: session.teamId,
      userId: session.userId,
      permission: MATCH_OPERATIONS_ACCESS_PERMISSION,
    });
    if (!scopeAllowsCategory(scope, category)) throw new MatchAccessDeniedError();
  }

  /**
   * Returns the only signature slot the authenticated actor is allowed to
   * edit for this match, or null when the actor may view but not sign.
   */
  async resolveSignatureActor(session: MatchActorSession, matchId: string): Promise<ActorRole | null> {
    const match = await this.matches.findById(matchId);
    if (!match) return null;

    const role = normalizeRole(session.role);
    if (role === "REFEREE" && !session.teamId) {
      const assignment = await this.assignments.findActiveAssignment(session.userId, matchId, "CENTER_REFEREE");
      return assignment ? "REFEREE" : null;
    }

    if (!session.teamId || (role !== "CLUB_ADMIN" && role !== "CLUB_STAFF")) {
      return null;
    }

    const actorRole: ActorRole | null =
      match.equipeHome === session.teamId
        ? "TEAM_HOME"
        : match.equipeAway === session.teamId
          ? "TEAM_AWAY"
          : null;
    if (!actorRole) return null;

    if (role === "CLUB_ADMIN") return actorRole;

    const category = clubCategoryForMatch(match, session.teamId);
    const [accessScope, signScope] = await Promise.all([
      this.clubRbac.getPermissionScope({
        teamId: session.teamId,
        userId: session.userId,
        permission: MATCH_OPERATIONS_ACCESS_PERMISSION,
      }),
      this.clubRbac.getPermissionScope({
        teamId: session.teamId,
        userId: session.userId,
        permission: MATCH_OPERATIONS_SIGN_PERMISSION,
      }),
    ]);

    return scopeAllowsCategory(accessScope, category) && scopeAllowsCategory(signScope, category)
      ? actorRole
      : null;
  }

  async assertSignatureActor(
    session: MatchActorSession,
    matchId: string,
    requestedActorRole: ActorRole,
  ): Promise<void> {
    const actorRole = await this.resolveSignatureActor(session, matchId);
    if (!actorRole || actorRole !== requestedActorRole) {
      throw new MatchAccessDeniedError();
    }
  }
}
