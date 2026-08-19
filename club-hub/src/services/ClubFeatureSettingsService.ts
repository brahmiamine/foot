import { ClubConfigurationAudit, type ClubConfigurationSnapshot } from "@/entities/ClubConfigurationAudit";
import { ClubFeatureSettings, type ClubFeature } from "@/entities/ClubFeatureSettings";
import { getDataSource } from "@/lib/database";
import {
  requireConfigurationChangeReason,
  type ConfigurationAuditContext,
} from "../../../packages/domain-contracts/src/configuration-audit";
import {
  resolvePolicy,
  type PolicyRecord,
} from "../../../packages/domain-contracts/src/policy";

export class ClubFeatureDisabledError extends Error {
  constructor(feature: ClubFeature) {
    super(`Le module ${feature} est désactivé pour ce club.`);
    this.name = "ClubFeatureDisabledError";
  }
}

export interface ClubFeatureMutationContext extends ConfigurationAuditContext {
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
}

export interface EffectiveClubFeatureSetting {
  enabled: boolean;
  version: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
}

const DEFAULTS = { enabled: true };

function toPolicyRecord(row: ClubFeatureSettings): PolicyRecord<typeof DEFAULTS> {
  return {
    id: row.id,
    scopeType: "CLUB",
    scopeId: row.teamId,
    version: row.version,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    values: { enabled: Boolean(row.enabled) },
  };
}

function sourceDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function snapshot(row: ClubFeatureSettings): ClubConfigurationSnapshot {
  return {
    id: row.id,
    teamId: row.teamId,
    feature: row.feature,
    enabled: Boolean(row.enabled),
    version: row.version,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: row.effectiveUntil?.toISOString() ?? null,
  };
}

/** GOV-010 — source de vérité serveur pour l'activation des modules Club Hub. */
export class ClubFeatureSettingsService {
  async get(
    teamId: string,
    feature: ClubFeature,
    at: Date = new Date(),
  ): Promise<EffectiveClubFeatureSetting> {
    const ds = await getDataSource();
    const rows = await ds.getRepository(ClubFeatureSettings).find({
      where: { teamId, feature },
      order: { version: "DESC" },
    });
    const resolved = resolvePolicy(DEFAULTS, rows.map(toPolicyRecord), { clubId: teamId }, at);
    const source = resolved.sources.enabled;
    return {
      enabled: resolved.values.enabled,
      version: source.kind === "POLICY" ? source.version ?? 0 : 0,
      effectiveFrom: source.kind === "POLICY" ? sourceDate(source.effectiveFrom) : null,
      effectiveUntil: source.kind === "POLICY" ? sourceDate(source.effectiveUntil) : null,
    };
  }

  async listEffective(
    teamId: string,
    features: ClubFeature[],
    at: Date = new Date(),
  ): Promise<Record<ClubFeature, EffectiveClubFeatureSetting>> {
    const entries = await Promise.all(
      features.map(async (feature) => [feature, await this.get(teamId, feature, at)] as const),
    );
    return Object.fromEntries(entries) as Record<ClubFeature, EffectiveClubFeatureSetting>;
  }

  async update(
    teamId: string,
    feature: ClubFeature,
    enabled: boolean,
    context: ClubFeatureMutationContext,
  ): Promise<ClubFeatureSettings> {
    const reason = requireConfigurationChangeReason(context.reason);
    const activation = context.effectiveFrom ?? new Date();
    if (context.effectiveUntil && context.effectiveUntil.getTime() <= activation.getTime()) {
      throw new Error("La fin d'effet doit être postérieure au début d'effet");
    }

    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(ClubFeatureSettings);
      const auditRepository = manager.getRepository(ClubConfigurationAudit);
      const versions = await repository.find({
        where: { teamId, feature },
        order: { version: "DESC" },
      });
      const latest = versions[0] ?? null;
      const row = repository.create({
        teamId,
        feature,
        enabled,
        version: (latest?.version ?? 0) + 1,
        effectiveFrom: activation,
        effectiveUntil: context.effectiveUntil ?? null,
        updatedBy: context.actorUserId,
      });
      const saved = await repository.save(row);

      await auditRepository.save(
        auditRepository.create({
          domain: "CLUB_FEATURES",
          configurationKey: "FEATURE_SETTINGS",
          scopeType: "CLUB_FEATURE",
          scopeId: `${teamId}:${feature}`,
          previousVersion: latest?.version ?? null,
          newVersion: saved.version,
          before: latest ? snapshot(latest) : null,
          after: snapshot(saved),
          actorUserId: context.actorUserId,
          actorRole: context.actorRole,
          reason,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        }),
      );
      return saved;
    });
  }

  async assertEnabled(
    teamId: string,
    feature: ClubFeature,
    at: Date = new Date(),
  ): Promise<void> {
    const setting = await this.get(teamId, feature, at);
    if (!setting.enabled) throw new ClubFeatureDisabledError(feature);
  }
}
