import { getDataSource } from "@/lib/database";
import { ClubConfigurationAudit, type ClubConfigurationSnapshot } from "@/entities/ClubConfigurationAudit";
import { PublicFormSettings, type PublicFormDomain } from "@/entities/PublicFormSettings";
import {
  requireConfigurationChangeReason,
  type ConfigurationAuditContext,
} from "../../../packages/domain-contracts/src/configuration-audit";
import {
  resolvePolicy,
  type PolicyRecord,
  type ResolvedPolicy,
} from "../../../packages/domain-contracts/src/policy";

export class PublicFormClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicFormClosedError";
  }
}

export interface PublicFormSettingsInput {
  isOpen: boolean;
  opensAt?: Date | null;
  closesAt?: Date | null;
  rateLimitMax?: number | null;
  rateLimitWindowMinutes?: number | null;
}

export interface PublicFormSettingsMutationContext extends ConfigurationAuditContext {
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
}

export interface EffectivePublicFormSettings extends PublicFormSettingsInput {
  version: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
}

const DEFAULTS: PublicFormSettingsInput = {
  isOpen: true,
  opensAt: null,
  closesAt: null,
  rateLimitMax: null,
  rateLimitWindowMinutes: null,
};

function toPolicyRecord(row: PublicFormSettings): PolicyRecord<PublicFormSettingsInput> {
  return {
    id: row.id,
    scopeType: "CLUB",
    scopeId: row.teamId,
    version: row.version,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    values: {
      isOpen: Boolean(row.isOpen),
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      rateLimitMax: row.rateLimitMax,
      rateLimitWindowMinutes: row.rateLimitWindowMinutes,
    },
  };
}

function snapshot(row: PublicFormSettings): ClubConfigurationSnapshot {
  return {
    id: row.id,
    teamId: row.teamId,
    domain: row.domain,
    isOpen: Boolean(row.isOpen),
    opensAt: row.opensAt?.toISOString() ?? null,
    closesAt: row.closesAt?.toISOString() ?? null,
    rateLimitMax: row.rateLimitMax,
    rateLimitWindowMinutes: row.rateLimitWindowMinutes,
    version: row.version,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: row.effectiveUntil?.toISOString() ?? null,
  };
}

/**
 * OB-001 / GOV-004 / GOV-005 : source unique de vérité versionnée pour
 * l'ouverture/fermeture et le rate limit des formulaires publics. Chaque
 * changement est append-only et audité dans la même transaction.
 */
export class PublicFormSettingsService {
  /** GOV-006 : résolution standardisée avec provenance DEFAULT ou CLUB/version. */
  async getExplained(
    teamId: string,
    domain: PublicFormDomain,
    at: Date = new Date(),
  ): Promise<ResolvedPolicy<PublicFormSettingsInput>> {
    const ds = await getDataSource();
    const rows = await ds.getRepository(PublicFormSettings).find({
      where: { teamId, domain },
      order: { version: "DESC" },
    });
    return resolvePolicy(DEFAULTS, rows.map(toPolicyRecord), { clubId: teamId }, at);
  }

  async get(
    teamId: string,
    domain: PublicFormDomain,
    at: Date = new Date(),
  ): Promise<EffectivePublicFormSettings> {
    const resolved = await this.getExplained(teamId, domain, at);
    const source = resolved.sources.isOpen;
    return {
      ...resolved.values,
      version: source.kind === "POLICY" ? source.version ?? 0 : 0,
      effectiveFrom: source.kind === "POLICY" && source.effectiveFrom ? new Date(source.effectiveFrom) : null,
      effectiveUntil: source.kind === "POLICY" && source.effectiveUntil ? new Date(source.effectiveUntil) : null,
    };
  }

  async listForTeam(teamId: string): Promise<PublicFormSettings[]> {
    const ds = await getDataSource();
    return ds.getRepository(PublicFormSettings).find({
      where: { teamId },
      order: { domain: "ASC", version: "DESC" },
    });
  }

  async update(
    teamId: string,
    domain: PublicFormDomain,
    input: PublicFormSettingsInput,
    context: PublicFormSettingsMutationContext,
  ): Promise<PublicFormSettings> {
    const reason = requireConfigurationChangeReason(context.reason);
    const activation = context.effectiveFrom ?? new Date();
    if (
      context.effectiveUntil &&
      context.effectiveUntil.getTime() <= activation.getTime()
    ) {
      throw new Error("La fin d'effet de la configuration doit être postérieure à son début d'effet");
    }

    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(PublicFormSettings);
      const auditRepository = manager.getRepository(ClubConfigurationAudit);
      const versions = await repository.find({
        where: { teamId, domain },
        order: { version: "DESC" },
      });
      const latest = versions[0] ?? null;
      const nextVersion = (latest?.version ?? 0) + 1;
      const row = repository.create({
        teamId,
        domain,
        isOpen: input.isOpen,
        opensAt: input.opensAt ?? null,
        closesAt: input.closesAt ?? null,
        rateLimitMax: input.rateLimitMax ?? null,
        rateLimitWindowMinutes: input.rateLimitWindowMinutes ?? null,
        version: nextVersion,
        effectiveFrom: activation,
        effectiveUntil: context.effectiveUntil ?? null,
        updatedBy: context.actorUserId,
      });
      const saved = await repository.save(row);

      await auditRepository.save(
        auditRepository.create({
          domain: "CLUB_PUBLIC",
          configurationKey: "PUBLIC_FORM_SETTINGS",
          scopeType: "CLUB_FORM",
          scopeId: `${teamId}:${domain}`,
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

  /**
   * Garde serveur unique, appelée par CHAQUE action de soumission publique
   * avant d'écrire quoi que ce soit. `countRecentSubmissions` est fourni
   * par l'appelant (chaque domaine compte dans sa propre table métier).
   */
  async assertOpen(
    teamId: string,
    domain: PublicFormDomain,
    countRecentSubmissions?: (windowStart: Date) => Promise<number>,
    now: Date = new Date(),
  ): Promise<void> {
    const settings = await this.get(teamId, domain, now);
    if (!settings.isOpen) {
      throw new PublicFormClosedError("Ce formulaire est actuellement fermé.");
    }
    if (settings.opensAt && now < settings.opensAt) {
      throw new PublicFormClosedError("Ce formulaire n'est pas encore ouvert.");
    }
    if (settings.closesAt && now >= settings.closesAt) {
      throw new PublicFormClosedError("Ce formulaire est fermé.");
    }
    if (settings.rateLimitMax != null && settings.rateLimitWindowMinutes != null && countRecentSubmissions) {
      const windowStart = new Date(now.getTime() - settings.rateLimitWindowMinutes * 60_000);
      const count = await countRecentSubmissions(windowStart);
      if (count >= settings.rateLimitMax) {
        throw new PublicFormClosedError("Trop de soumissions récentes, merci de réessayer plus tard.");
      }
    }
  }
}
