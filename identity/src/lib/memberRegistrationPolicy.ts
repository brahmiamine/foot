import { MemberRegistrationPolicy } from "@/entities/MemberRegistrationPolicy";
import {
  IdentityPolicyAudit,
  type MemberRegistrationPolicySnapshot,
} from "@/entities/IdentityPolicyAudit";
import { getDataSource } from "./db";
import { requireConfigurationChangeReason } from "../../../packages/domain-contracts/src/configuration-audit";

export type MemberRegistrationMode =
  | "OPEN"
  | "EMAIL_VERIFICATION"
  | "CLUB_APPROVAL"
  | "INVITE_ONLY"
  | "CLOSED";

export type MemberRegistrationDecision =
  | "CREATE_ACTIVE"
  | "PENDING_EMAIL_VERIFICATION"
  | "PENDING_CLUB_APPROVAL"
  | "REQUIRE_INVITATION"
  | "REJECT";

export interface EffectiveMemberRegistrationPolicy {
  teamId: string;
  mode: MemberRegistrationMode;
  version: number;
  source: "DEFAULT" | "DATABASE";
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
}

export interface UpdateMemberRegistrationPolicyInput {
  teamId: string;
  mode: MemberRegistrationMode;
  updatedBy: string;
  actorRole: string;
  reason: string;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Pure policy decision shared by password and OAuth registration paths. */
export function decideMemberRegistration(input: {
  mode: MemberRegistrationMode;
  hasValidInvitation: boolean;
  emailVerifiedByProvider: boolean;
}): MemberRegistrationDecision {
  switch (input.mode) {
    case "OPEN":
      return "CREATE_ACTIVE";
    case "EMAIL_VERIFICATION":
      return input.emailVerifiedByProvider ? "CREATE_ACTIVE" : "PENDING_EMAIL_VERIFICATION";
    case "CLUB_APPROVAL":
      return "PENDING_CLUB_APPROVAL";
    case "INVITE_ONLY":
      return input.hasValidInvitation ? "CREATE_ACTIVE" : "REQUIRE_INVITATION";
    case "CLOSED":
      return "REJECT";
  }
}

function isActive(policy: MemberRegistrationPolicy, at: Date): boolean {
  if (policy.effectiveFrom && policy.effectiveFrom.getTime() > at.getTime()) return false;
  if (policy.effectiveUntil && policy.effectiveUntil.getTime() <= at.getTime()) return false;
  return true;
}

function snapshot(policy: MemberRegistrationPolicy): MemberRegistrationPolicySnapshot {
  return {
    teamId: policy.teamId,
    mode: policy.mode,
    version: policy.version,
    effectiveFrom: policy.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: policy.effectiveUntil?.toISOString() ?? null,
  };
}

export async function getMemberRegistrationPolicy(
  teamId: string,
  at: Date = new Date(),
): Promise<EffectiveMemberRegistrationPolicy> {
  const repository = (await getDataSource()).getRepository(MemberRegistrationPolicy);
  const versions = await repository.find({ where: { teamId }, order: { version: "DESC" } });
  const stored = versions.find((policy) => isActive(policy, at));
  if (!stored) {
    return {
      teamId,
      mode: "OPEN",
      version: 0,
      source: "DEFAULT",
      effectiveFrom: null,
      effectiveUntil: null,
    };
  }
  return {
    teamId,
    mode: stored.mode,
    version: stored.version,
    source: "DATABASE",
    effectiveFrom: stored.effectiveFrom ?? null,
    effectiveUntil: stored.effectiveUntil ?? null,
  };
}

export async function updateMemberRegistrationPolicy(
  input: UpdateMemberRegistrationPolicyInput,
): Promise<EffectiveMemberRegistrationPolicy> {
  if (
    input.effectiveFrom &&
    input.effectiveUntil &&
    input.effectiveUntil.getTime() <= input.effectiveFrom.getTime()
  ) {
    throw new Error("La fin d'effet doit être postérieure au début d'effet");
  }
  const reason = requireConfigurationChangeReason(input.reason);
  const activation = input.effectiveFrom ?? new Date();
  const dataSource = await getDataSource();
  let saved: MemberRegistrationPolicy | null = null;

  await dataSource.transaction(async (manager) => {
    const repository = manager.getRepository(MemberRegistrationPolicy);
    const auditRepository = manager.getRepository(IdentityPolicyAudit);
    const versions = await repository.find({ where: { teamId: input.teamId }, order: { version: "DESC" } });
    const latest = versions[0] ?? null;
    const entity = repository.create({
      teamId: input.teamId,
      mode: input.mode,
      version: (latest?.version ?? 0) + 1,
      effectiveFrom: activation,
      effectiveUntil: input.effectiveUntil ?? null,
      updatedBy: input.updatedBy,
    });
    saved = await repository.save(entity);
    await auditRepository.save(
      auditRepository.create({
        domain: "IDENTITY_MEMBERSHIP",
        configurationKey: "MEMBER_REGISTRATION_POLICY",
        scopeType: "CLUB",
        scopeId: input.teamId,
        previousVersion: latest?.version ?? null,
        newVersion: saved.version,
        before: latest ? snapshot(latest) : null,
        after: snapshot(saved),
        actorUserId: input.updatedBy,
        actorRole: input.actorRole,
        reason,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      }),
    );
  });

  if (!saved) return getMemberRegistrationPolicy(input.teamId, activation);
  return {
    teamId: saved.teamId,
    mode: saved.mode,
    version: saved.version,
    source: "DATABASE",
    effectiveFrom: saved.effectiveFrom ?? null,
    effectiveUntil: saved.effectiveUntil ?? null,
  };
}
