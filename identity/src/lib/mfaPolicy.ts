import type { SsoUser } from "./session";
import { getDataSource } from "./db";
import { MfaRolePolicy, type MfaPolicyMode } from "@/entities/MfaRolePolicy";
import { IdentityPolicyAudit, type MfaRolePolicySnapshot } from "@/entities/IdentityPolicyAudit";
import { requireConfigurationChangeReason } from "../../../packages/domain-contracts/src/configuration-audit";

export interface EffectiveMfaRolePolicy {
  role: SsoUser["role"];
  mode: MfaPolicyMode;
  gracePeriodDays: number;
  version: number;
  source: "DEFAULT" | "DATABASE";
  updatedAt: Date | null;
  graceEndsAt: Date | null;
  requirementEnforced: boolean;
}

const DEFAULTS: Record<SsoUser["role"], { mode: MfaPolicyMode; gracePeriodDays: number }> = {
  SUPERADMIN: { mode: "REQUIRED", gracePeriodDays: 0 },
  PLATFORM_SUPERADMIN: { mode: "REQUIRED", gracePeriodDays: 0 },
  FEDERATION_ADMIN: { mode: "REQUIRED", gracePeriodDays: 0 },
  LEAGUE_ADMIN: { mode: "REQUIRED", gracePeriodDays: 0 },
  ADMIN: { mode: "OPTIONAL", gracePeriodDays: 0 },
  OBSERVATEUR: { mode: "OPTIONAL", gracePeriodDays: 0 },
  MEMBER: { mode: "OPTIONAL", gracePeriodDays: 0 },
  REFEREE: { mode: "OPTIONAL", gracePeriodDays: 0 },
  MATCH_OFFICIAL: { mode: "OPTIONAL", gracePeriodDays: 0 },
  REFEREE_OBSERVER: { mode: "OPTIONAL", gracePeriodDays: 0 },
  PLAYER: { mode: "OPTIONAL", gracePeriodDays: 0 },
};

function computeGraceEndsAt(policy: Pick<MfaRolePolicy, "gracePeriodDays" | "updatedAt">): Date | null {
  if (!policy.gracePeriodDays || policy.gracePeriodDays <= 0) return null;
  return new Date(policy.updatedAt.getTime() + policy.gracePeriodDays * 24 * 60 * 60 * 1000);
}

function snapshot(policy: Pick<MfaRolePolicy, "role" | "mode" | "gracePeriodDays" | "version">): MfaRolePolicySnapshot {
  return {
    role: policy.role,
    mode: policy.mode,
    gracePeriodDays: policy.gracePeriodDays,
    version: policy.version,
  };
}

export async function getMfaRolePolicy(
  role: SsoUser["role"],
  at: Date = new Date(),
): Promise<EffectiveMfaRolePolicy> {
  const repository = (await getDataSource()).getRepository(MfaRolePolicy);
  const stored = await repository.findOne({ where: { role } });
  if (!stored) {
    const fallback = DEFAULTS[role];
    return {
      role,
      ...fallback,
      version: 0,
      source: "DEFAULT",
      updatedAt: null,
      graceEndsAt: null,
      requirementEnforced: fallback.mode === "REQUIRED",
    };
  }

  const graceEndsAt = computeGraceEndsAt(stored);
  return {
    role,
    mode: stored.mode,
    gracePeriodDays: stored.gracePeriodDays,
    version: stored.version,
    source: "DATABASE",
    updatedAt: stored.updatedAt,
    graceEndsAt,
    requirementEnforced:
      stored.mode === "REQUIRED" && (graceEndsAt == null || at.getTime() >= graceEndsAt.getTime()),
  };
}

export async function listMfaRolePolicies(at: Date = new Date()): Promise<EffectiveMfaRolePolicy[]> {
  return Promise.all((Object.keys(DEFAULTS) as SsoUser["role"][]).map((role) => getMfaRolePolicy(role, at)));
}

export async function updateMfaRolePolicy(input: {
  role: SsoUser["role"];
  mode: MfaPolicyMode;
  gracePeriodDays: number;
  updatedBy: string;
  actorRole: SsoUser["role"];
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<EffectiveMfaRolePolicy> {
  if (!Number.isInteger(input.gracePeriodDays) || input.gracePeriodDays < 0 || input.gracePeriodDays > 90) {
    throw new Error("La période de grâce MFA doit être comprise entre 0 et 90 jours");
  }
  const reason = requireConfigurationChangeReason(input.reason);
  const dataSource = await getDataSource();

  await dataSource.transaction(async (manager) => {
    const repository = manager.getRepository(MfaRolePolicy);
    const auditRepository = manager.getRepository(IdentityPolicyAudit);
    const current = await repository.findOne({ where: { role: input.role } });

    if (current && current.mode === input.mode && current.gracePeriodDays === input.gracePeriodDays) {
      return;
    }

    const before = current ? snapshot(current) : null;
    const entity = current ?? repository.create({ role: input.role, version: 1 });
    entity.mode = input.mode;
    entity.gracePeriodDays = input.gracePeriodDays;
    entity.version = current ? current.version + 1 : 1;
    entity.updatedBy = input.updatedBy;
    const saved = await repository.save(entity);

    await auditRepository.save(
      auditRepository.create({
        domain: "IDENTITY_SECURITY",
        configurationKey: "MFA_ROLE_POLICY",
        scopeType: "ROLE",
        scopeId: input.role,
        previousVersion: before?.version ?? null,
        newVersion: saved.version,
        before,
        after: snapshot(saved),
        actorUserId: input.updatedBy,
        actorRole: input.actorRole,
        reason,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      }),
    );
  });

  return getMfaRolePolicy(input.role);
}

export function mfaDefaultForRole(role: SsoUser["role"]) {
  return DEFAULTS[role];
}
