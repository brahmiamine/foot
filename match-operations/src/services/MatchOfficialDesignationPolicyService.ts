import { getDataSource } from "@/lib/db";
import { MatchOfficialDesignationPolicy } from "@/entities/MatchOfficialDesignationPolicy";
import { DEFAULT_DESIGNATION_POLICY, type DesignationPolicyValues } from "@/lib/designationPolicy";

export type UpdateDesignationPolicyInput = Partial<DesignationPolicyValues>;

function hasOwn(value: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function sanitize(values: UpdateDesignationPolicyInput): UpdateDesignationPolicyInput {
  const raw = values as Record<string, unknown>;
  return {
    ...(hasOwn(raw, "mode") ? { mode: raw.mode as DesignationPolicyValues["mode"] } : {}),
    ...(hasOwn(raw, "minRestHours") ? { minRestHours: raw.minRestHours as number } : {}),
    ...(hasOwn(raw, "requiredGrades") ? { requiredGrades: raw.requiredGrades as string[] | null } : {}),
    ...(hasOwn(raw, "minHistoryMatches") ? { minHistoryMatches: raw.minHistoryMatches as number } : {}),
    ...(hasOwn(raw, "maxDistanceKm") ? { maxDistanceKm: raw.maxDistanceKm as number | null } : {}),
  };
}

function validate(values: UpdateDesignationPolicyInput): void {
  if (values.mode && !["MANUAL", "SUGGESTED", "AUTO"].includes(values.mode)) {
    throw new Error("mode invalide (MANUAL, SUGGESTED ou AUTO attendu)");
  }
  if (values.minRestHours != null && (!Number.isInteger(values.minRestHours) || values.minRestHours < 0)) {
    throw new Error("minRestHours doit être un entier positif ou nul");
  }
  if (values.minHistoryMatches != null && (!Number.isInteger(values.minHistoryMatches) || values.minHistoryMatches < 0)) {
    throw new Error("minHistoryMatches doit être un entier positif ou nul");
  }
  if (values.maxDistanceKm != null && (!Number.isInteger(values.maxDistanceKm) || values.maxDistanceKm < 0)) {
    throw new Error("maxDistanceKm doit être un entier positif ou nul");
  }
  if (values.requiredGrades != null && !Array.isArray(values.requiredGrades)) {
    throw new Error("requiredGrades doit être un tableau ou null");
  }
}

function toValue(row: MatchOfficialDesignationPolicy | null): DesignationPolicyValues & { version: number; updatedBy: string | null; updatedAt: Date | null } {
  if (!row) return { ...DEFAULT_DESIGNATION_POLICY, version: 0, updatedBy: null, updatedAt: null };
  return {
    mode: row.mode,
    minRestHours: row.minRestHours,
    requiredGrades: row.requiredGrades ?? null,
    minHistoryMatches: row.minHistoryMatches,
    maxDistanceKm: row.maxDistanceKm ?? null,
    version: row.version,
    updatedBy: row.updatedBy ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

/** REF-006 — un seul scope PLATFORM actif à la fois, historisé par incrément de version. */
export class MatchOfficialDesignationPolicyService {
  private async currentRow(): Promise<MatchOfficialDesignationPolicy | null> {
    const ds = await getDataSource();
    return ds.getRepository(MatchOfficialDesignationPolicy).findOne({ where: {}, order: { version: "DESC" } });
  }

  async resolve(): Promise<DesignationPolicyValues> {
    return toValue(await this.currentRow());
  }

  async get() {
    return toValue(await this.currentRow());
  }

  async update(values: UpdateDesignationPolicyInput, actorUserId: string) {
    const safe = sanitize(values);
    validate(safe);
    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      const repo = manager.getRepository(MatchOfficialDesignationPolicy);
      const current = await repo.findOne({ where: {}, order: { version: "DESC" } });
      const row = repo.create({
        mode: current?.mode ?? DEFAULT_DESIGNATION_POLICY.mode,
        minRestHours: current?.minRestHours ?? DEFAULT_DESIGNATION_POLICY.minRestHours,
        requiredGrades: current?.requiredGrades ?? DEFAULT_DESIGNATION_POLICY.requiredGrades,
        minHistoryMatches: current?.minHistoryMatches ?? DEFAULT_DESIGNATION_POLICY.minHistoryMatches,
        maxDistanceKm: current?.maxDistanceKm ?? DEFAULT_DESIGNATION_POLICY.maxDistanceKm,
        ...safe,
        version: current ? current.version + 1 : 1,
        updatedBy: actorUserId,
      });
      await repo.save(row);
    });
    return this.get();
  }
}
