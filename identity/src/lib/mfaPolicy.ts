import type { SsoUser } from "./session";
import { getDataSource } from "./db";
import { MfaRolePolicy, type MfaPolicyMode } from "@/entities/MfaRolePolicy";

export interface EffectiveMfaRolePolicy {
  role: SsoUser["role"];
  mode: MfaPolicyMode;
  gracePeriodDays: number;
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
}): Promise<EffectiveMfaRolePolicy> {
  if (!Number.isInteger(input.gracePeriodDays) || input.gracePeriodDays < 0 || input.gracePeriodDays > 90) {
    throw new Error("La période de grâce MFA doit être comprise entre 0 et 90 jours");
  }
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(MfaRolePolicy);
  const current = await repository.findOne({ where: { role: input.role } });
  const entity = current ?? repository.create({ role: input.role });
  entity.mode = input.mode;
  entity.gracePeriodDays = input.gracePeriodDays;
  entity.updatedBy = input.updatedBy;
  await repository.save(entity);
  return getMfaRolePolicy(input.role);
}

export function mfaDefaultForRole(role: SsoUser["role"]) {
  return DEFAULTS[role];
}
