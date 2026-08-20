export type DisciplineCompetitionType = "championnat" | "coupe" | "tournois";

export interface DisciplineRuleValues {
  yellowWarningThreshold: number;
  yellowSuspensionThreshold: number;
  yellowSuspensionMatches: number;
  yellowFineAmount: number;
  redFineAmount: number;
  fineDueDays: number;
  defaultRedSuspensionMatches: number;
  defaultDoubleYellowSuspensionMatches: number;
}

export interface DisciplineRuleCandidate extends DisciplineRuleValues {
  id: string;
  teamId: string;
  seasonId: string | null;
  competitionType: DisciplineCompetitionType | null;
  category: string | null;
  version: number;
  validFrom: Date;
  validUntil: Date | null;
}

export interface DisciplineRuleContext {
  teamId: string;
  seasonId: string | null;
  competitionType: DisciplineCompetitionType | null;
  category: string | null;
  at: Date;
}

export interface ResolvedDisciplineRule extends DisciplineRuleValues {
  source: "LEGACY" | "RULE_SET";
  ruleSetId: string | null;
  version: number;
  overrideId: string | null;
}

export interface DisciplineRuleOverrideInput {
  id: string;
  reason: string;
  validFrom: Date;
  validUntil: Date | null;
  revokedAt: Date | null;
  values: Partial<DisciplineRuleValues>;
}

export const LEGACY_DISCIPLINE_RULE: DisciplineRuleValues = Object.freeze({
  yellowWarningThreshold: 2,
  yellowSuspensionThreshold: 3,
  yellowSuspensionMatches: 1,
  yellowFineAmount: 30,
  redFineAmount: 50,
  fineDueDays: 15,
  defaultRedSuspensionMatches: 1,
  defaultDoubleYellowSuspensionMatches: 1,
});

function isEffective(validFrom: Date, validUntil: Date | null, at: Date): boolean {
  const timestamp = at.getTime();
  return validFrom.getTime() <= timestamp && (!validUntil || timestamp < validUntil.getTime());
}

function matchesScope(rule: DisciplineRuleCandidate, context: DisciplineRuleContext): boolean {
  if (rule.teamId !== context.teamId) return false;
  if (rule.seasonId !== null && rule.seasonId !== context.seasonId) return false;
  if (rule.competitionType !== null && rule.competitionType !== context.competitionType) return false;
  if (rule.category !== null && rule.category !== context.category) return false;
  return true;
}

function specificity(rule: DisciplineRuleCandidate): number {
  return Number(rule.seasonId !== null) + Number(rule.competitionType !== null) + Number(rule.category !== null);
}

function valuesFrom(rule: DisciplineRuleCandidate): DisciplineRuleValues {
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

export function resolveDisciplineRule(
  candidates: readonly DisciplineRuleCandidate[],
  context: DisciplineRuleContext,
): ResolvedDisciplineRule {
  const applicable = candidates
    .filter((rule) => matchesScope(rule, context) && isEffective(rule.validFrom, rule.validUntil, context.at))
    .sort((left, right) => {
      const specificityDelta = specificity(right) - specificity(left);
      if (specificityDelta !== 0) return specificityDelta;
      const versionDelta = right.version - left.version;
      if (versionDelta !== 0) return versionDelta;
      const validFromDelta = right.validFrom.getTime() - left.validFrom.getTime();
      if (validFromDelta !== 0) return validFromDelta;
      return right.id.localeCompare(left.id);
    });

  const selected = applicable[0];
  if (!selected) {
    return {
      ...LEGACY_DISCIPLINE_RULE,
      source: "LEGACY",
      ruleSetId: null,
      version: 0,
      overrideId: null,
    };
  }

  return {
    ...valuesFrom(selected),
    source: "RULE_SET",
    ruleSetId: selected.id,
    version: selected.version,
    overrideId: null,
  };
}

export function applyDisciplineOverride(
  base: ResolvedDisciplineRule,
  override: DisciplineRuleOverrideInput | null | undefined,
  at: Date,
): ResolvedDisciplineRule {
  if (
    !override ||
    override.revokedAt ||
    !override.reason.trim() ||
    !isEffective(override.validFrom, override.validUntil, at)
  ) {
    return { ...base };
  }

  return {
    ...base,
    ...override.values,
    overrideId: override.id,
  };
}

export function validateDisciplineRuleValues(values: DisciplineRuleValues): void {
  const integerFields: Array<keyof DisciplineRuleValues> = [
    "yellowWarningThreshold",
    "yellowSuspensionThreshold",
    "yellowSuspensionMatches",
    "fineDueDays",
    "defaultRedSuspensionMatches",
    "defaultDoubleYellowSuspensionMatches",
  ];
  for (const field of integerFields) {
    const value = values[field];
    if (!Number.isInteger(value) || value < 0) throw new Error(`Valeur disciplinaire invalide: ${field}`);
  }
  if (values.yellowSuspensionThreshold < 1) throw new Error("Le seuil de suspension jaune doit être supérieur à 0");
  if (values.yellowWarningThreshold >= values.yellowSuspensionThreshold) {
    throw new Error("Le seuil d'alerte jaune doit être inférieur au seuil de suspension");
  }
  if (!Number.isFinite(values.yellowFineAmount) || values.yellowFineAmount < 0) throw new Error("Montant d'amende jaune invalide");
  if (!Number.isFinite(values.redFineAmount) || values.redFineAmount < 0) throw new Error("Montant d'amende rouge invalide");
}
