import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";
import { Settings } from "@/entities/Settings";
import {
  DisciplineRuleApplication,
  DisciplineRuleOverride,
  DisciplineRuleSet,
  type DisciplineOverrideTargetType,
} from "@/entities/DisciplineRule";
import {
  applyDisciplineOverride,
  LEGACY_DISCIPLINE_RULE,
  resolveDisciplineRule,
  validateDisciplineRuleValues,
  type DisciplineCompetitionType,
  type DisciplineRuleCandidate,
  type DisciplineRuleValues,
  type ResolvedDisciplineRule,
} from "@/lib/disciplineRules";
import type { EntityManager } from "typeorm";

export interface CreateDisciplineRuleSetInput extends DisciplineRuleValues {
  seasonId?: string | null;
  competitionType?: DisciplineCompetitionType | null;
  category?: string | null;
  validFrom: Date;
  validUntil?: Date | null;
  reason: string;
}

export interface CreateDisciplineOverrideInput {
  targetType: DisciplineOverrideTargetType;
  targetId: string;
  validFrom: Date;
  validUntil?: Date | null;
  reason: string;
  values: Partial<DisciplineRuleValues>;
}

export interface EffectiveDisciplineRule {
  resolved: ResolvedDisciplineRule;
  application: DisciplineRuleApplication;
}

interface MatchDisciplineContext {
  matchId: string;
  seasonId: string | null;
  competitionType: DisciplineCompetitionType | null;
  effectiveAt: Date;
}

function normalizeNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizedValues(input: DisciplineRuleValues): DisciplineRuleValues {
  const values: DisciplineRuleValues = {
    yellowWarningThreshold: Number(input.yellowWarningThreshold),
    yellowSuspensionThreshold: Number(input.yellowSuspensionThreshold),
    yellowSuspensionMatches: Number(input.yellowSuspensionMatches),
    yellowFineAmount: Number(input.yellowFineAmount),
    redFineAmount: Number(input.redFineAmount),
    fineDueDays: Number(input.fineDueDays),
    defaultRedSuspensionMatches: Number(input.defaultRedSuspensionMatches),
    defaultDoubleYellowSuspensionMatches: Number(input.defaultDoubleYellowSuspensionMatches),
  };
  validateDisciplineRuleValues(values);
  return values;
}

function partialValues(input: Partial<DisciplineRuleValues>): Partial<DisciplineRuleValues> {
  const allowed = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<DisciplineRuleValues>;
  const merged = normalizedValues({ ...LEGACY_DISCIPLINE_RULE, ...allowed });
  return Object.fromEntries(Object.keys(allowed).map((key) => [key, merged[key as keyof DisciplineRuleValues]])) as Partial<DisciplineRuleValues>;
}

function candidateFromEntity(rule: DisciplineRuleSet): DisciplineRuleCandidate {
  return {
    id: rule.id,
    teamId: rule.teamId,
    seasonId: rule.seasonId,
    competitionType: rule.competitionType,
    category: rule.category,
    version: rule.version,
    validFrom: rule.validFrom,
    validUntil: rule.validUntil,
    yellowWarningThreshold: rule.yellowWarningThreshold,
    yellowSuspensionThreshold: rule.yellowSuspensionThreshold,
    yellowSuspensionMatches: rule.yellowSuspensionMatches,
    yellowFineAmount: Number(rule.yellowFineAmount),
    redFineAmount: Number(rule.redFineAmount),
    fineDueDays: rule.fineDueDays,
    defaultRedSuspensionMatches: rule.defaultRedSuspensionMatches,
    defaultDoubleYellowSuspensionMatches: rule.defaultDoubleYellowSuspensionMatches,
  };
}

function snapshotValues(rule: ResolvedDisciplineRule): DisciplineRuleValues {
  return {
    yellowWarningThreshold: rule.yellowWarningThreshold,
    yellowSuspensionThreshold: rule.yellowSuspensionThreshold,
    yellowSuspensionMatches: rule.yellowSuspensionMatches,
    yellowFineAmount: rule.yellowFineAmount,
    redFineAmount: rule.redFineAmount,
    fineDueDays: rule.fineDueDays,
    defaultRedSuspensionMatches: rule.defaultRedSuspensionMatches,
    defaultDoubleYellowSuspensionMatches: rule.defaultDoubleYellowSuspensionMatches,
  };
}

function resolvedFromApplication(application: DisciplineRuleApplication): ResolvedDisciplineRule {
  return {
    ...application.ruleSnapshot,
    source: application.context.source,
    ruleSetId: application.ruleSetId,
    version: application.ruleVersion,
    overrideId: application.overrideId,
  };
}

async function loadMatchContext(
  manager: EntityManager,
  teamId: string,
  matchId: string,
): Promise<MatchDisciplineContext> {
  const rows = await manager.query(
    `SELECT m.id AS matchId, m.date AS matchDate, j.saison_id AS seasonId, s.type_competition AS competitionType
       FROM matches m
       LEFT JOIN journees j ON j.id = m.journee_id
       LEFT JOIN saisons s ON s.id = j.saison_id
      WHERE m.id = ? AND (m.equipe_home = ? OR m.equipe_away = ?)
      LIMIT 1`,
    [matchId, teamId, teamId],
  ) as Array<{
    matchId: string;
    matchDate: Date | string | null;
    seasonId: string | null;
    competitionType: DisciplineCompetitionType | null;
  }>;
  const row = rows[0];
  if (!row) throw new Error("Match introuvable pour ce club");
  const matchDate = row.matchDate ? new Date(row.matchDate) : new Date();
  return {
    matchId: row.matchId,
    seasonId: row.seasonId ?? null,
    competitionType: row.competitionType ?? null,
    effectiveAt: matchDate,
  };
}

async function legacyWithConfiguredFines(manager: EntityManager): Promise<ResolvedDisciplineRule> {
  const settings = await manager.getRepository(Settings).findOne({ where: {} });
  return {
    ...LEGACY_DISCIPLINE_RULE,
    yellowFineAmount: Number(settings?.yellowFineAmount ?? LEGACY_DISCIPLINE_RULE.yellowFineAmount),
    redFineAmount: Number(settings?.redFineAmount ?? LEGACY_DISCIPLINE_RULE.redFineAmount),
    fineDueDays: settings?.fineDueDays ?? LEGACY_DISCIPLINE_RULE.fineDueDays,
    source: "LEGACY",
    ruleSetId: null,
    version: 0,
    overrideId: null,
  };
}

export class DisciplineRuleService {
  async listRuleSets(teamId: string): Promise<DisciplineRuleSet[]> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(DisciplineRuleSet).find({
      where: { teamId },
      order: { validFrom: "DESC", version: "DESC" },
    });
  }

  async listOverrides(teamId: string): Promise<DisciplineRuleOverride[]> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(DisciplineRuleOverride).find({
      where: { teamId },
      order: { createdAt: "DESC" },
    });
  }

  async createRuleSet(
    teamId: string,
    input: CreateDisciplineRuleSetInput,
    actorUserId: string,
  ): Promise<DisciplineRuleSet> {
    const values = normalizedValues(input);
    const reason = input.reason.trim();
    if (reason.length < 3) throw new Error("Un motif de version est obligatoire");
    if (input.validUntil && input.validUntil.getTime() <= input.validFrom.getTime()) {
      throw new Error("La fin de validité doit être postérieure au début");
    }
    const seasonId = normalizeNullable(input.seasonId);
    const category = normalizeNullable(input.category);
    const competitionType = input.competitionType ?? null;
    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DisciplineRuleSet);
      const latest = await repository.findOne({
        where: { teamId, seasonId, competitionType, category },
        order: { version: "DESC" },
        lock: { mode: "pessimistic_write" },
      });
      const rule = repository.create({
        teamId,
        seasonId,
        competitionType,
        category,
        version: (latest?.version ?? 0) + 1,
        validFrom: input.validFrom,
        validUntil: input.validUntil ?? null,
        ...values,
        yellowFineAmount: values.yellowFineAmount.toFixed(3),
        redFineAmount: values.redFineAmount.toFixed(3),
        reason,
        createdBy: actorUserId,
      });
      return repository.save(rule);
    });
  }

  async createOverride(
    teamId: string,
    input: CreateDisciplineOverrideInput,
    actorUserId: string,
  ): Promise<DisciplineRuleOverride> {
    const reason = input.reason.trim();
    if (reason.length < 3) throw new Error("Un motif d'override est obligatoire");
    if (input.validUntil && input.validUntil.getTime() <= input.validFrom.getTime()) {
      throw new Error("La fin de validité doit être postérieure au début");
    }
    const values = partialValues(input.values);
    if (Object.keys(values).length === 0) throw new Error("Au moins une valeur doit être surchargée");
    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      if (input.targetType === "PLAYER") {
        const player = await manager.getRepository(Player).findOne({ where: { id: input.targetId, teamId } });
        if (!player) throw new Error("Joueur introuvable pour ce club");
      } else {
        await loadMatchContext(manager, teamId, input.targetId);
      }
      const repository = manager.getRepository(DisciplineRuleOverride);
      return repository.save(repository.create({
        teamId,
        targetType: input.targetType,
        targetId: input.targetId,
        values,
        validFrom: input.validFrom,
        validUntil: input.validUntil ?? null,
        reason,
        createdBy: actorUserId,
        revokedAt: null,
        revokedBy: null,
        revocationReason: null,
      }));
    });
  }

  async revokeOverride(
    teamId: string,
    overrideId: string,
    actorUserId: string,
    reason: string,
  ): Promise<DisciplineRuleOverride> {
    const revocationReason = reason.trim();
    if (revocationReason.length < 3) throw new Error("Un motif de révocation est obligatoire");
    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DisciplineRuleOverride);
      const override = await repository.findOne({
        where: { id: overrideId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!override) throw new Error("Override disciplinaire introuvable");
      if (override.revokedAt) return override;
      override.revokedAt = new Date();
      override.revokedBy = actorUserId;
      override.revocationReason = revocationReason;
      return repository.save(override);
    });
  }

  /**
   * Résout puis persiste une fois pour toutes la règle utilisée par un carton.
   * Un second appel relit le snapshot existant : aucune modification future
   * du RuleSet ou d'un override ne peut modifier rétroactivement la sanction.
   */
  async resolveAndSnapshotForCard(
    teamId: string,
    matchId: string,
    playerId: string,
    cardId: string,
    actorUserId: string,
  ): Promise<EffectiveDisciplineRule> {
    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      const applicationRepository = manager.getRepository(DisciplineRuleApplication);
      const existing = await applicationRepository.findOne({
        where: { cardId, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (existing) return { resolved: resolvedFromApplication(existing), application: existing };

      const player = await manager.getRepository(Player).findOne({ where: { id: playerId, teamId } });
      if (!player) throw new Error("Joueur introuvable pour ce club");
      const context = await loadMatchContext(manager, teamId, matchId);
      const rules = await manager.getRepository(DisciplineRuleSet).find({ where: { teamId } });
      let resolved = resolveDisciplineRule(rules.map(candidateFromEntity), {
        teamId,
        seasonId: context.seasonId,
        competitionType: context.competitionType,
        category: player.category ?? null,
        at: context.effectiveAt,
      });
      if (resolved.source === "LEGACY") resolved = await legacyWithConfiguredFines(manager);

      const overrides = await manager.getRepository(DisciplineRuleOverride).find({
        where: [
          { teamId, targetType: "MATCH", targetId: matchId },
          { teamId, targetType: "PLAYER", targetId: playerId },
        ],
        order: { createdAt: "DESC" },
      });
      const applicable = overrides
        .filter((override) => !override.revokedAt)
        .sort((left, right) => {
          const targetDelta = Number(right.targetType === "PLAYER") - Number(left.targetType === "PLAYER");
          if (targetDelta !== 0) return targetDelta;
          return right.createdAt.getTime() - left.createdAt.getTime();
        })
        .find((override) => {
          const candidate = applyDisciplineOverride(resolved, {
            id: override.id,
            reason: override.reason,
            validFrom: override.validFrom,
            validUntil: override.validUntil,
            revokedAt: override.revokedAt,
            values: override.values,
          }, context.effectiveAt);
          return candidate.overrideId === override.id;
        });
      if (applicable) {
        resolved = applyDisciplineOverride(resolved, {
          id: applicable.id,
          reason: applicable.reason,
          validFrom: applicable.validFrom,
          validUntil: applicable.validUntil,
          revokedAt: applicable.revokedAt,
          values: applicable.values,
        }, context.effectiveAt);
      }
      validateDisciplineRuleValues(snapshotValues(resolved));

      const application = await applicationRepository.save(applicationRepository.create({
        teamId,
        cardId,
        matchId,
        playerId,
        ruleSetId: resolved.ruleSetId,
        ruleVersion: resolved.version,
        overrideId: resolved.overrideId,
        context: {
          seasonId: context.seasonId,
          competitionType: context.competitionType,
          category: player.category ?? null,
          effectiveAt: context.effectiveAt.toISOString(),
          source: resolved.source,
        },
        ruleSnapshot: snapshotValues(resolved),
        appliedBy: actorUserId,
      }));
      return { resolved, application };
    });
  }
}
