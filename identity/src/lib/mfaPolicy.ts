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
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  updatedAt: Date | null;
  graceEndsAt: Date | null;
  requirementEnforced: boolean;
}

export interface UpdateMfaRolePolicyInput {
  role: SsoUser["role"];
  mode: MfaPolicyMode;
  gracePeriodDays: number;
  updatedBy: string;
  actorRole: SsoUser["role"];
  reason: string;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
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

function isActive(policy: MfaRolePolicy, at: Date): boolean {
  if (policy.effectiveFrom && policy.effectiveFrom.getTime() > at.getTime()) return false;
  if (policy.effectiveUntil && policy.effectiveUntil.getTime() <= at.getTime()) return false;
  return true;
}

function computeGraceEndsAt(
  policy: Pick<MfaRolePolicy, "gracePeriodDays" | "effectiveFrom" | "updatedAt">,
): Date | null {
  if (!policy.gracePeriodDays || policy.gracePeriodDays <= 0) return null;
  const start = policy.effectiveFrom ?? policy.updatedAt;
  return new Date(start.getTime() + policy.gracePeriodDays * 24 * 60 * 60 * 1000);
}

function snapshot(
  policy: Pick<
    MfaRolePolicy,
    "role" | "mode" | "gracePeriodDays" | "version" | "effectiveFrom" | "effectiveUntil"
  >,
): MfaRolePolicySnapshot {
  return {
    role: policy.role,
    mode: policy.mode,
    gracePeriodDays: policy.gracePeriodDays,
    version: policy.version,
    effectiveFrom: policy.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: policy.effectiveUntil?.toISOString() ?? null,
  };
}

function effectiveFromStored(stored: MfaRolePolicy, at: Date): EffectiveMfaRolePolicy {
  const graceEndsAt = computeGraceEndsAt(stored);
  return {
    role: stored.role,
    mode: stored.mode,
    gracePeriodDays: stored.gracePeriodDays,
    version: stored.version,
    source: "DATABASE",
    effectiveFrom: stored.effectiveFrom ?? null,
    effectiveUntil: stored.effectiveUntil ?? null,
    updatedAt: stored.updatedAt,
    graceEndsAt,
    requirementEnforced:
      stored.mode === "REQUIRED" && (graceEndsAt == null || at.getTime() >= graceEndsAt.getTime()),
  };
}

export async function getMfaRolePolicy(
  role: SsoUser["role"],
  at: Date = new Date(),
): Promise<EffectiveMfaRolePolicy> {
  const repository = (await getDataSource()).getRepository(MfaRolePolicy);
  const versions = await repository.find({ where: { role }, order: { version: "DESC" } });
  const stored = versions.find((policy) => isActive(policy, at));
  if (!stored) {
    const fallback = DEFAULTS[role];
    return {
      role,
      ...fallback,
      version: 0,
      source: "DEFAULT",
      effectiveFrom: null,
      effectiveUntil: null,
      updatedAt: null,
      graceEndsAt: null,
      requirementEnforced: fallback.mode === "REQUIRED",
    };
  }

  return effectiveFromStored(stored, at);
}

export async function listMfaRolePolicies(at: Date = new Date()): Promise<EffectiveMfaRolePolicy[]> {
  return Promise.all((Object.keys(DEFAULTS) as SsoUser["role"][]).map((role) => getMfaRolePolicy(role, at)));
}

export async function updateMfaRolePolicy(
  input: UpdateMfaRolePolicyInput,
): Promise<EffectiveMfaRolePolicy> {
  if (!Number.isInteger(input.gracePeriodDays) || input.gracePeriodDays < 0 || input.gracePeriodDays > 90) {
    throw new Error("La période de grâce MFA doit être comprise entre 0 et 90 jours");
  }
  if (
    input.effectiveFrom &&
    input.effectiveUntil &&
    input.effectiveUntil.getTime() <= input.effectiveFrom.getTime()
  ) {
    throw new Error("La fin d'effet MFA doit être postérieure au début d'effet");
  }

  const reason = requireConfigurationChangeReason(input.reason);
  const dataSource = await getDataSource();
  const activation = input.effectiveFrom ?? new Date();
  let savedPolicy: MfaRolePolicy | null = null;

  await dataSource.transaction(async (manager) => {
    const repository = manager.getRepository(MfaRolePolicy);
    const auditRepository = manager.getRepository(IdentityPolicyAudit);
    const versions = await repository.find({ where: { role: input.role }, order: { version: "DESC" } });
    const latest = versions[0] ?? null;

    if (
      latest &&
      input.effectiveFrom == null &&
      input.effectiveUntil == null &&
      latest.effectiveUntil == null &&
      latest.mode === input.mode &&
      latest.gracePeriodDays === input.gracePeriodDays &&
      isActive(latest, activation)
    ) {
      savedPolicy = latest;
      return;
    }

    const before = latest ? snapshot(latest) : null;
    const entity = repository.create({
      role: input.role,
      mode: input.mode,
      gracePeriodDays: input.gracePeriodDays,
      version: latest ? latest.version + 1 : 1,
      effectiveFrom: activation,
      effectiveUntil: input.effectiveUntil ?? null,
      updatedBy: input.updatedBy,
    });
    const saved = await repository.save(entity);
    savedPolicy = saved;

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

  if (!savedPolicy) {
    return getMfaRolePolicy(input.role, activation);
  }
  return effectiveFromStored(savedPolicy, activation);
}

export function mfaDefaultForRole(role: SsoUser["role"]) {
  return DEFAULTS[role];
}