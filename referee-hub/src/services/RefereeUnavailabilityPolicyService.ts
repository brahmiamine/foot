import { getDataSource } from "@/lib/db";
import {
  RefereeUnavailabilityPolicy,
  type RefereeUnavailabilityPolicyValues,
} from "@/entities/RefereeUnavailabilityPolicy";
import { RefereeConfigurationAudit } from "@/entities/RefereeConfigurationAudit";
import { DEFAULT_UNAVAILABILITY_POLICY } from "@/lib/unavailabilityPolicy";
import {
  resolvePolicy,
  type PolicyRecord,
  type ResolvedPolicy,
} from "../../../packages/domain-contracts/src/policy";
import {
  requireConfigurationChangeReason,
  type ConfigurationAuditContext,
} from "../../../packages/domain-contracts/src/configuration-audit";

function toPolicyRecord(row: RefereeUnavailabilityPolicy): PolicyRecord<RefereeUnavailabilityPolicyValues> {
  return {
    id: row.id,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    version: row.version,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    values: row.values,
  };
}

export interface UpsertUnavailabilityPolicyInput extends ConfigurationAuditContext {
  values: Partial<RefereeUnavailabilityPolicyValues>;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
}

/**
 * REF-003 / GOV-004 / GOV-005 — policy versionnée PLATFORM (préavis, durée
 * maximale, récurrence, justificatifs), résolue par `resolvePolicy` et
 * modifiable uniquement avec motif obligatoire audité.
 */
export class RefereeUnavailabilityPolicyService {
  async resolveExplained(at: Date = new Date()): Promise<ResolvedPolicy<RefereeUnavailabilityPolicyValues>> {
    const ds = await getDataSource();
    const records = await ds.getRepository(RefereeUnavailabilityPolicy).find();
    return resolvePolicy(DEFAULT_UNAVAILABILITY_POLICY, records.map(toPolicyRecord), {}, at);
  }

  async resolve(at: Date = new Date()): Promise<RefereeUnavailabilityPolicyValues> {
    return (await this.resolveExplained(at)).values;
  }

  async findAll(): Promise<RefereeUnavailabilityPolicy[]> {
    const ds = await getDataSource();
    return ds.getRepository(RefereeUnavailabilityPolicy).find({ order: { version: "DESC" } });
  }

  async upsert(input: UpsertUnavailabilityPolicyInput): Promise<RefereeUnavailabilityPolicy> {
    const reason = requireConfigurationChangeReason(input.reason);
    const activation = input.effectiveFrom ?? new Date();
    if (input.effectiveUntil && input.effectiveUntil.getTime() <= activation.getTime()) {
      throw new Error("La fin d'effet de la policy doit être postérieure à son début d'effet");
    }
    const ds = await getDataSource();

    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(RefereeUnavailabilityPolicy);
      const auditRepository = manager.getRepository(RefereeConfigurationAudit);
      const current = await repository.findOne({
        where: { scopeType: "PLATFORM" },
        order: { version: "DESC" },
      });

      const nextVersion = current ? current.version + 1 : 1;
      const saved = await repository.save(
        repository.create({
          scopeType: "PLATFORM",
          scopeId: null,
          version: nextVersion,
          effectiveFrom: activation,
          effectiveUntil: input.effectiveUntil ?? null,
          values: input.values,
          updatedBy: input.actorUserId,
        }),
      );

      await auditRepository.save(
        auditRepository.create({
          domain: "REFEREE_UNAVAILABILITY",
          configurationKey: "UNAVAILABILITY_POLICY",
          scopeType: "PLATFORM",
          scopeId: null,
          previousVersion: current?.version ?? null,
          newVersion: saved.version,
          before: current ? { values: current.values } : null,
          after: { values: saved.values },
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          reason,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        }),
      );

      return saved;
    });
  }
}
