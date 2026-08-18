import { IsNull } from "typeorm";
import { getDataSource } from "@/lib/database";
import {
  resolvePolicy,
  type PolicyRecord,
} from "../../../packages/domain-contracts/src/policy";
import {
  PublicContentPolicy,
  PUBLIC_SECTION_KEYS,
  type PublicContentScopeType,
  type PublicSectionKey,
  type EmergencyBanner,
} from "@/entities/PublicContentPolicy";

/**
 * Chaque section est sa propre clé de premier niveau (et non regroupée
 * sous un objet `sections`) pour que `resolvePolicy` hérite section par
 * section entre PLATFORM et CLUB — voir le même choix (et sa justification
 * détaillée) dans `notifications/src/policy/policy.service.ts`. La bannière
 * d'urgence, elle, reste un objet atomique unique : un club qui la
 * surcharge veut remplacer le message plateforme en entier, pas fusionner
 * ses champs.
 */
export type PublicContentPolicyValues = Record<PublicSectionKey, boolean> & {
  emergencyBanner: EmergencyBanner;
};

const DEFAULT_VALUES: PublicContentPolicyValues = {
  ...(Object.fromEntries(PUBLIC_SECTION_KEYS.map((key) => [key, true])) as Record<PublicSectionKey, boolean>),
  emergencyBanner: { enabled: false, messageFr: null, messageAr: null, severity: "INFO" },
};

export interface UpsertPublicContentPolicyInput {
  scopeType: PublicContentScopeType;
  scopeId: string | null;
  sections?: Partial<Record<PublicSectionKey, boolean>>;
  emergencyBanner?: Partial<EmergencyBanner>;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
  actorUserId: string;
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

/**
 * OB-004 : sections publiques activables + bannière d'urgence, résolues
 * PLATFORM -> CLUB (GOV-001). "Programmation de publication" = une nouvelle
 * version dont `effectiveFrom` est dans le futur, gérée nativement par
 * `resolvePolicy` (aucun mécanisme séparé nécessaire).
 */
export class PublicContentPolicyService {
  async resolve(teamId: string | null, at: Date = new Date()): Promise<PublicContentPolicyValues> {
    const ds = await getDataSource();
    const records = await ds.getRepository(PublicContentPolicy).find();
    const resolved = resolvePolicy(DEFAULT_VALUES, records.map(toPolicyRecord), { clubId: teamId }, at);
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
    const ds = await getDataSource();

    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(PublicContentPolicy);
      const current = await repository.findOne({
        where: { scopeType: input.scopeType, scopeId: scopeId ?? IsNull() },
        order: { version: "DESC" },
      });

      const nextVersion = current ? current.version + 1 : 1;
      return repository.save(
        repository.create({
          scopeType: input.scopeType,
          scopeId,
          version: nextVersion,
          effectiveFrom: input.effectiveFrom ?? null,
          effectiveUntil: input.effectiveUntil ?? null,
          sections: input.sections ?? null,
          emergencyBanner: input.emergencyBanner ?? null,
          updatedBy: input.actorUserId,
        }),
      );
    });
  }
}
