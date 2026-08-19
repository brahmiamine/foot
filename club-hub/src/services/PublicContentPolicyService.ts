import { IsNull } from "typeorm";
import { getDataSource } from "@/lib/database";
import { ClubConfigurationAudit, type ClubConfigurationSnapshot } from "@/entities/ClubConfigurationAudit";
import {
  resolvePolicy,
  type PolicyRecord,
  type ResolvedPolicy,
} from "../../../packages/domain-contracts/src/policy";
import {
  requireConfigurationChangeReason,
  type ConfigurationAuditContext,
} from "../../../packages/domain-contracts/src/configuration-audit";
import {
  PublicContentPolicy,
  PUBLIC_SECTION_KEYS,
  type PublicContentScopeType,
  type PublicSectionKey,
  type EmergencyBanner,
} from "@/entities/PublicContentPolicy";

/**
 * Chaque section est sa propre clé de premier niveau pour que `resolvePolicy`
 * hérite section par section entre PLATFORM et CLUB. La bannière d'urgence
 * reste un objet atomique unique.
 */
export type PublicContentPolicyValues = Record<PublicSectionKey, boolean> & {
  emergencyBanner: EmergencyBanner;
};

const DEFAULT_VALUES: PublicContentPolicyValues = {
  ...(Object.fromEntries(PUBLIC_SECTION_KEYS.map((key) => [key, true])) as Record<PublicSectionKey, boolean>),
  emergencyBanner: { enabled: false, messageFr: null, messageAr: null, severity: "INFO" },
};

export interface UpsertPublicContentPolicyInput extends ConfigurationAuditContext {
  scopeType: PublicContentScopeType;
  scopeId: string | null;
  sections?: Partial<Record<PublicSectionKey, boolean>>;
  emergencyBanner?: Partial<EmergencyBanner>;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
}

function toPolicyRecord(row: PublicContentPolicy): PolicyRecord<PublicContentPolicyValues> {
  const values: Partial<PublicContentPolicyValues> = { ...(row.sections ?? {}) };
  if (row.emergencyBanner) {
    values.emergencyBanner = { ...DEFAULT_VALUES.emergencyBanner, ...row.emergencyBanner };
  }
  return {
    id: row.id,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    version: row.version,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    values,
  };
}

function snapshot(row: PublicContentPolicy): ClubConfigurationSnapshot {
  return {
    id: row.id,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    version: row.version,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: row.effectiveUntil?.toISOString() ?? null,
    sections: row.sections,
    emergencyBanner: row.emergencyBanner,
  };
}

/**
 * OB-004 / GOV-004 / GOV-005 : sections publiques + bannière d'urgence,
 * résolues PLATFORM -> CLUB. Chaque nouvelle version est append-only et son
 * changement de configuration est audité dans la même transaction.
 */
export class PublicContentPolicyService {
  /** GOV-006 : expose aussi la provenance exacte de chaque valeur héritée. */
  async resolveExplained(
    teamId: string | null,
    at: Date = new Date(),
  ): Promise<ResolvedPolicy<PublicContentPolicyValues>> {
    const ds = await getDataSource();
    const records = await ds.getRepository(PublicContentPolicy).find();
    return resolvePolicy(DEFAULT_VALUES, records.map(toPolicyRecord), { clubId: teamId }, at);
  }

  async resolve(teamId: string | null, at: Date = new Date()): Promise<PublicContentPolicyValues> {
    const resolved = await this.resolveExplained(teamId, at);
    return resolved.values;
  }

  async isSectionEnabled(teamId: string | null, section: PublicSectionKey, at: Date = new Date()): Promise<boolean> {
    const resolved = await this.resolve(teamId, at);
    return resolved[section];
  }

  async findAll(): Promise<PublicContentPolicy[]> {
    const ds = await getDataSource();
    return ds.getRepository(PublicContentPolicy).find({ order: { scopeType: "ASC", version: "DESC" } });
  }

  async upsert(input: UpsertPublicContentPolicyInput): Promise<PublicContentPolicy> {
    if (input.scopeType === "CLUB" && !input.scopeId) {
      throw new Error("scopeId is required for CLUB-scoped public content policies");
    }
    const scopeId = input.scopeType === "PLATFORM" ? null : input.scopeId;
    const activation = input.effectiveFrom ?? new Date();
    if (input.effectiveUntil && input.effectiveUntil.getTime() <= activation.getTime()) {
      throw new Error("La fin d'effet de la policy publique doit être postérieure à son début d'effet");
    }
    const reason = requireConfigurationChangeReason(input.reason);
    const ds = await getDataSource();

    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(PublicContentPolicy);
      const auditRepository = manager.getRepository(ClubConfigurationAudit);
      const current = await repository.findOne({
        where: { scopeType: input.scopeType, scopeId: scopeId ?? IsNull() },
        order: { version: "DESC" },
      });

      const nextVersion = current ? current.version + 1 : 1;
      const saved = await repository.save(
        repository.create({
          scopeType: input.scopeType,
          scopeId,
          version: nextVersion,
          effectiveFrom: activation,
          effectiveUntil: input.effectiveUntil ?? null,
          sections: input.sections ?? null,
          emergencyBanner: input.emergencyBanner ?? null,
          updatedBy: input.actorUserId,
        }),
      );

      await auditRepository.save(
        auditRepository.create({
          domain: "CLUB_PUBLIC",
          configurationKey: "PUBLIC_CONTENT_POLICY",
          scopeType: input.scopeType,
          scopeId,
          previousVersion: current?.version ?? null,
          newVersion: saved.version,
          before: current ? snapshot(current) : null,
          after: snapshot(saved),
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
