import { getDataSource } from "@/lib/db";
import { RefereeReportPolicy, type RefereeReportPolicyValues } from "@/entities/RefereeReportPolicy";
import { RefereeConfigurationAudit } from "@/entities/RefereeConfigurationAudit";
import { DEFAULT_REPORT_POLICY } from "@/lib/reportPolicy";
import {
  resolvePolicy,
  type PolicyRecord,
  type ResolvedPolicy,
} from "../../../packages/domain-contracts/src/policy";
import {
  requireConfigurationChangeReason,
  type ConfigurationAuditContext,
} from "../../../packages/domain-contracts/src/configuration-audit";

function toPolicyRecord(row: RefereeReportPolicy): PolicyRecord<RefereeReportPolicyValues> {
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

export interface UpsertReportPolicyInput extends ConfigurationAuditContext {
  values: Partial<RefereeReportPolicyValues>;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
}

/**
 * REF-004 / GOV-004 / GOV-005 — policy versionnée PLATFORM (rôles
 * obligatoires, délai, rappel, escalade des rapports d'officiels).
 */
export class RefereeReportPolicyService {
  async resolveExplained(at: Date = new Date()): Promise<ResolvedPolicy<RefereeReportPolicyValues>> {
    const ds = await getDataSource();
    const records = await ds.getRepository(RefereeReportPolicy).find();
    return resolvePolicy(DEFAULT_REPORT_POLICY, records.map(toPolicyRecord), {}, at);
  }

  async resolve(at: Date = new Date()): Promise<RefereeReportPolicyValues> {
    return (await this.resolveExplained(at)).values;
  }

  async findAll(): Promise<RefereeReportPolicy[]> {
    const ds = await getDataSource();
    return ds.getRepository(RefereeReportPolicy).find({ order: { version: "DESC" } });
  }

  async upsert(input: UpsertReportPolicyInput): Promise<RefereeReportPolicy> {
    const reason = requireConfigurationChangeReason(input.reason);
    const activation = input.effectiveFrom ?? new Date();
    if (input.effectiveUntil && input.effectiveUntil.getTime() <= activation.getTime()) {
      throw new Error("La fin d'effet de la policy doit être postérieure à son début d'effet");
    }
    const ds = await getDataSource();

    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(RefereeReportPolicy);
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
          domain: "REFEREE_REPORT",
          configurationKey: "REPORT_POLICY",
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
