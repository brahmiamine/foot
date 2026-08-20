import { Staff } from "@/entities/Staff";
import { LineupLockPolicy } from "@/entities/LineupLockPolicy";
import { TrainingApprovalPolicy } from "@/entities/TrainingApprovalPolicy";
import { StatReviewPolicy } from "@/entities/StatReviewPolicy";
import { HeadCoachDelegation } from "@/entities/HeadCoachDelegation";
import { StaffConfigurationAudit } from "@/entities/StaffConfigurationAudit";
import {
  resolvePolicy,
  type PolicyRecord,
} from "../../../../packages/domain-contracts/src/policy";
import {
  requireConfigurationChangeReason,
  type ConfigurationAuditContext,
} from "../../../../packages/domain-contracts/src/configuration-audit";
import { StaffMatchService } from "./StaffMatchService";

export interface StaffPolicyMutationContext extends ConfigurationAuditContext {
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
}

export interface EffectiveLineupLockPolicy {
  enabled: boolean;
  lockMinutesBeforeKickoff: number;
  version: number;
}

export interface EffectiveTrainingApprovalPolicy {
  approvalRequired: boolean;
  version: number;
}

export interface EffectiveStatReviewPolicy {
  reviewWindowHours: number;
  version: number;
}

export interface GrantHeadCoachDelegationInput {
  delegatorUserId: string;
  delegateeUserId: string;
  delegateeStaffId: number;
  matchId?: string | null;
  friendlyMatchId?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  reason: string;
}

const LINEUP_LOCK_DEFAULTS = { enabled: false, lockMinutesBeforeKickoff: 60 };
const TRAINING_APPROVAL_DEFAULTS = { approvalRequired: false };
const STAT_REVIEW_DEFAULTS = { reviewWindowHours: 72 };

/**
 * STAFF-002 à STAFF-005 — policies de gouvernance du staff technique
 * (verrouillage composition, validation des plans d'entraînement, revue des
 * statistiques, délégation temporaire de coach principal), scopées par club
 * et résolues via le contrat partagé `resolvePolicy` (GOV-001). L'absence de
 * ligne de policy préserve toujours le comportement historique.
 */
export class StaffGovernanceService extends StaffMatchService {
  private async writeAudit(
    domain: string,
    configurationKey: string,
    scopeId: string,
    previousVersion: number | null,
    newVersion: number,
    before: Record<string, unknown> | null,
    after: Record<string, unknown>,
    context: ConfigurationAuditContext,
  ): Promise<void> {
    const reason = requireConfigurationChangeReason(context.reason);
    const ds = await this.ds();
    const repo = ds.getRepository(StaffConfigurationAudit);
    await repo.save(
      repo.create({
        domain,
        configurationKey,
        scopeType: "CLUB",
        scopeId,
        previousVersion,
        newVersion,
        before,
        after,
        actorUserId: context.actorUserId,
        actorRole: context.actorRole,
        reason,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      }),
    );
  }

  // ------------------------------------------------------------------
  // STAFF-002 : verrouillage automatique de la composition avant coup d'envoi
  // ------------------------------------------------------------------

  async getLineupLockPolicy(teamId: string, at: Date = new Date()): Promise<EffectiveLineupLockPolicy> {
    const ds = await this.ds();
    const rows = await ds
      .getRepository(LineupLockPolicy)
      .find({ where: { teamId }, order: { version: "DESC" } });
    const records: PolicyRecord<typeof LINEUP_LOCK_DEFAULTS>[] = rows.map((row) => ({
      id: row.id,
      scopeType: "CLUB",
      scopeId: row.teamId,
      version: row.version,
      effectiveFrom: row.effectiveFrom,
      effectiveUntil: row.effectiveUntil,
      values: { enabled: Boolean(row.enabled), lockMinutesBeforeKickoff: row.lockMinutesBeforeKickoff },
    }));
    const resolved = resolvePolicy(LINEUP_LOCK_DEFAULTS, records, { clubId: teamId }, at);
    const source = resolved.sources.enabled;
    return {
      enabled: resolved.values.enabled,
      lockMinutesBeforeKickoff: resolved.values.lockMinutesBeforeKickoff,
      version: source.kind === "POLICY" ? (source.version ?? 0) : 0,
    };
  }

  async updateLineupLockPolicy(
    teamId: string,
    input: { enabled: boolean; lockMinutesBeforeKickoff: number },
    context: StaffPolicyMutationContext,
  ): Promise<LineupLockPolicy> {
    if (!Number.isInteger(input.lockMinutesBeforeKickoff) || input.lockMinutesBeforeKickoff < 0) {
      throw new Error("Le délai de verrouillage doit être un entier positif ou nul");
    }
    const activation = context.effectiveFrom ?? new Date();
    if (context.effectiveUntil && context.effectiveUntil.getTime() <= activation.getTime()) {
      throw new Error("La fin d'effet doit être postérieure au début d'effet");
    }

    const ds = await this.ds();
    const repo = ds.getRepository(LineupLockPolicy);
    const versions = await repo.find({ where: { teamId }, order: { version: "DESC" } });
    const latest = versions[0] ?? null;
    const saved = await repo.save(
      repo.create({
        teamId,
        enabled: input.enabled,
        lockMinutesBeforeKickoff: input.lockMinutesBeforeKickoff,
        version: (latest?.version ?? 0) + 1,
        effectiveFrom: activation,
        effectiveUntil: context.effectiveUntil ?? null,
        updatedBy: context.actorUserId,
      }),
    );

    await this.writeAudit(
      "STAFF_LINEUP_LOCK_POLICY",
      "LINEUP_LOCK_POLICY",
      teamId,
      latest?.version ?? null,
      saved.version,
      latest ? { enabled: Boolean(latest.enabled), lockMinutesBeforeKickoff: latest.lockMinutesBeforeKickoff, version: latest.version } : null,
      { enabled: saved.enabled, lockMinutesBeforeKickoff: saved.lockMinutesBeforeKickoff, version: saved.version },
      context,
    );
    return saved;
  }

  /** Vrai si, selon la policy club en vigueur, la composition est verrouillée sans action manuelle. */
  async isLineupAutoLocked(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    matchId?: string,
    friendlyMatchId?: number,
    at: Date = new Date(),
  ): Promise<boolean> {
    const policy = await this.getLineupLockPolicy(teamId, at);
    if (!policy.enabled) return false;
    const kickoff = await this.resolveKickoff(teamId, matchType, matchId, friendlyMatchId);
    if (!kickoff) return false;
    const threshold = kickoff.getTime() - policy.lockMinutesBeforeKickoff * 60_000;
    return at.getTime() >= threshold;
  }

  // ------------------------------------------------------------------
  // STAFF-003 : validation optionnelle des plans d'entraînement
  // ------------------------------------------------------------------

  async getTrainingApprovalPolicy(teamId: string, at: Date = new Date()): Promise<EffectiveTrainingApprovalPolicy> {
    const ds = await this.ds();
    const rows = await ds
      .getRepository(TrainingApprovalPolicy)
      .find({ where: { teamId }, order: { version: "DESC" } });
    const records: PolicyRecord<typeof TRAINING_APPROVAL_DEFAULTS>[] = rows.map((row) => ({
      id: row.id,
      scopeType: "CLUB",
      scopeId: row.teamId,
      version: row.version,
      effectiveFrom: row.effectiveFrom,
      effectiveUntil: row.effectiveUntil,
      values: { approvalRequired: Boolean(row.approvalRequired) },
    }));
    const resolved = resolvePolicy(TRAINING_APPROVAL_DEFAULTS, records, { clubId: teamId }, at);
    const source = resolved.sources.approvalRequired;
    return {
      approvalRequired: resolved.values.approvalRequired,
      version: source.kind === "POLICY" ? (source.version ?? 0) : 0,
    };
  }

  async updateTrainingApprovalPolicy(
    teamId: string,
    input: { approvalRequired: boolean },
    context: StaffPolicyMutationContext,
  ): Promise<TrainingApprovalPolicy> {
    const activation = context.effectiveFrom ?? new Date();
    if (context.effectiveUntil && context.effectiveUntil.getTime() <= activation.getTime()) {
      throw new Error("La fin d'effet doit être postérieure au début d'effet");
    }

    const ds = await this.ds();
    const repo = ds.getRepository(TrainingApprovalPolicy);
    const versions = await repo.find({ where: { teamId }, order: { version: "DESC" } });
    const latest = versions[0] ?? null;
    const saved = await repo.save(
      repo.create({
        teamId,
        approvalRequired: input.approvalRequired,
        version: (latest?.version ?? 0) + 1,
        effectiveFrom: activation,
        effectiveUntil: context.effectiveUntil ?? null,
        updatedBy: context.actorUserId,
      }),
    );

    await this.writeAudit(
      "STAFF_TRAINING_APPROVAL_POLICY",
      "TRAINING_APPROVAL_POLICY",
      teamId,
      latest?.version ?? null,
      saved.version,
      latest ? { approvalRequired: Boolean(latest.approvalRequired), version: latest.version } : null,
      { approvalRequired: saved.approvalRequired, version: saved.version },
      context,
    );
    return saved;
  }

  // ------------------------------------------------------------------
  // STAFF-004 : revue puis verrouillage des statistiques post-match
  // ------------------------------------------------------------------

  async getStatReviewPolicy(teamId: string, at: Date = new Date()): Promise<EffectiveStatReviewPolicy> {
    const ds = await this.ds();
    const rows = await ds
      .getRepository(StatReviewPolicy)
      .find({ where: { teamId }, order: { version: "DESC" } });
    const records: PolicyRecord<typeof STAT_REVIEW_DEFAULTS>[] = rows.map((row) => ({
      id: row.id,
      scopeType: "CLUB",
      scopeId: row.teamId,
      version: row.version,
      effectiveFrom: row.effectiveFrom,
      effectiveUntil: row.effectiveUntil,
      values: { reviewWindowHours: row.reviewWindowHours },
    }));
    const resolved = resolvePolicy(STAT_REVIEW_DEFAULTS, records, { clubId: teamId }, at);
    const source = resolved.sources.reviewWindowHours;
    return {
      reviewWindowHours: resolved.values.reviewWindowHours,
      version: source.kind === "POLICY" ? (source.version ?? 0) : 0,
    };
  }

  async updateStatReviewPolicy(
    teamId: string,
    input: { reviewWindowHours: number },
    context: StaffPolicyMutationContext,
  ): Promise<StatReviewPolicy> {
    if (!Number.isInteger(input.reviewWindowHours) || input.reviewWindowHours < 0) {
      throw new Error("La fenêtre de revue doit être un entier positif ou nul");
    }
    const activation = context.effectiveFrom ?? new Date();
    if (context.effectiveUntil && context.effectiveUntil.getTime() <= activation.getTime()) {
      throw new Error("La fin d'effet doit être postérieure au début d'effet");
    }

    const ds = await this.ds();
    const repo = ds.getRepository(StatReviewPolicy);
    const versions = await repo.find({ where: { teamId }, order: { version: "DESC" } });
    const latest = versions[0] ?? null;
    const saved = await repo.save(
      repo.create({
        teamId,
        reviewWindowHours: input.reviewWindowHours,
        version: (latest?.version ?? 0) + 1,
        effectiveFrom: activation,
        effectiveUntil: context.effectiveUntil ?? null,
        updatedBy: context.actorUserId,
      }),
    );

    await this.writeAudit(
      "STAFF_STAT_REVIEW_POLICY",
      "STAT_REVIEW_POLICY",
      teamId,
      latest?.version ?? null,
      saved.version,
      latest ? { reviewWindowHours: latest.reviewWindowHours, version: latest.version } : null,
      { reviewWindowHours: saved.reviewWindowHours, version: saved.version },
      context,
    );
    return saved;
  }

  /** Vrai si la fenêtre de revue post-match est écoulée (aucun effet si le match n'est pas identifié). */
  async isStatLocked(teamId: string, matchDate: Date | null, at: Date = new Date()): Promise<boolean> {
    if (!matchDate) return false;
    const policy = await this.getStatReviewPolicy(teamId, at);
    const threshold = matchDate.getTime() + policy.reviewWindowHours * 60 * 60_000;
    return at.getTime() >= threshold;
  }

  async auditStatCorrection(
    teamId: string,
    statId: number,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    context: ConfigurationAuditContext,
  ): Promise<void> {
    await this.writeAudit(
      "STAFF_PLAYER_STAT_CORRECTION",
      "PLAYER_STAT_CORRECTION",
      `${teamId}:${statId}`,
      null,
      1,
      before,
      after,
      context,
    );
  }

  // ------------------------------------------------------------------
  // STAFF-005 : délégation temporaire de coach principal
  // ------------------------------------------------------------------

  async grantHeadCoachDelegation(teamId: string, input: GrantHeadCoachDelegationInput): Promise<HeadCoachDelegation> {
    const reason = input.reason.trim();
    if (reason.length < 3) throw new Error("Un motif de délégation est obligatoire");

    if (input.matchId && input.friendlyMatchId) {
      throw new Error("La délégation ne peut cibler qu'un seul match");
    }
    const hasMatchScope = Boolean(input.matchId) || Boolean(input.friendlyMatchId);
    const hasPeriodScope = Boolean(input.validFrom) || Boolean(input.validUntil);
    if (hasMatchScope && hasPeriodScope) {
      throw new Error("La délégation doit être bornée soit à un match, soit à une période, jamais les deux");
    }
    if (!hasMatchScope && !hasPeriodScope) {
      throw new Error("La délégation doit préciser un match ou une période bornée");
    }
    if (hasPeriodScope) {
      if (!input.validFrom || !input.validUntil) {
        throw new Error("Une période de délégation doit préciser un début et une fin");
      }
      if (input.validUntil.getTime() <= input.validFrom.getTime()) {
        throw new Error("La fin de délégation doit être postérieure au début");
      }
    }

    const ds = await this.ds();
    const staff = await ds.getRepository(Staff).findOne({ where: { id: input.delegateeStaffId, teamId } });
    if (!staff) throw new Error("Le délégataire doit être un membre du staff de ce club");
    if (staff.staffType !== "COACH" && staff.staffType !== "ADJOINT") {
      throw new Error("Seul un coach ou un adjoint peut recevoir une délégation d'entraîneur principal");
    }

    const repo = ds.getRepository(HeadCoachDelegation);
    return repo.save(
      repo.create({
        teamId,
        delegatorUserId: input.delegatorUserId,
        delegateeUserId: input.delegateeUserId,
        delegateeStaffId: input.delegateeStaffId,
        matchId: input.matchId ?? null,
        friendlyMatchId: input.friendlyMatchId ?? null,
        validFrom: input.validFrom ?? null,
        validUntil: input.validUntil ?? null,
        reason,
        revokedAt: null,
        revokedBy: null,
        revocationReason: null,
      }),
    );
  }

  async revokeHeadCoachDelegation(id: string, teamId: string, actorUserId: string, reason: string): Promise<void> {
    const trimmed = reason.trim();
    if (trimmed.length < 3) throw new Error("Un motif de révocation est obligatoire");
    const ds = await this.ds();
    const repo = ds.getRepository(HeadCoachDelegation);
    const delegation = await repo.findOne({ where: { id, teamId } });
    if (!delegation || delegation.revokedAt) return;
    delegation.revokedAt = new Date();
    delegation.revokedBy = actorUserId;
    delegation.revocationReason = trimmed;
    await repo.save(delegation);
  }

  async listHeadCoachDelegations(teamId: string): Promise<HeadCoachDelegation[]> {
    const ds = await this.ds();
    return ds.getRepository(HeadCoachDelegation).find({ where: { teamId }, order: { createdAt: "DESC" } });
  }

  /** Vrai si `userId` détient une délégation active de coach principal couvrant ce match ou cet instant. */
  async isHeadCoachDelegated(
    teamId: string,
    userId: string,
    scope: { matchId?: string | null; friendlyMatchId?: number | null },
    at: Date = new Date(),
  ): Promise<boolean> {
    const ds = await this.ds();
    const delegations = await ds.getRepository(HeadCoachDelegation).find({ where: { teamId, delegateeUserId: userId } });
    return delegations.some((delegation) => {
      if (delegation.revokedAt && delegation.revokedAt.getTime() <= at.getTime()) return false;
      if (delegation.matchId || delegation.friendlyMatchId) {
        return (
          delegation.matchId === (scope.matchId ?? null) &&
          delegation.friendlyMatchId === (scope.friendlyMatchId ?? null)
        );
      }
      if (delegation.validFrom && delegation.validFrom.getTime() > at.getTime()) return false;
      if (delegation.validUntil && delegation.validUntil.getTime() <= at.getTime()) return false;
      return true;
    });
  }
}
