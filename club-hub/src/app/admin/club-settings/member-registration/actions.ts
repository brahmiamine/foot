"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { createClubIdentityMemberRegistrationAdapter } from "@/adapters/identity/createClubIdentityMemberRegistrationAdapter";
import type { MemberRegistrationMode } from "../../../../../../packages/domain-contracts/src/identity";

const MODES = new Set<MemberRegistrationMode>([
  "OPEN",
  "EMAIL_VERIFICATION",
  "CLUB_APPROVAL",
  "INVITE_ONLY",
  "CLOSED",
]);

function requestIp(headersList: Headers): string | null {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headersList.get("x-real-ip");
}

export async function updateMemberRegistrationPolicyAction(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const mode = String(formData.get("mode") ?? "") as MemberRegistrationMode;
  if (!MODES.has(mode)) throw new Error("Mode d'inscription invalide");
  const reason = String(formData.get("reason") ?? "");
  const requestHeaders = await headers();
  await createClubIdentityMemberRegistrationAdapter().updateMemberRegistrationPolicy({
    teamId,
    mode,
    actorUserId: access.userId,
    actorRole: access.actorRole ?? "ADMIN",
    reason,
    ipAddress: requestIp(requestHeaders),
    userAgent: requestHeaders.get("user-agent"),
  });
  revalidatePath("/admin/club-settings/member-registration");
}

export async function approveMemberRegistrationAction(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!requestId) throw new Error("Demande invalide");
  await createClubIdentityMemberRegistrationAdapter().approveMemberRegistration(
    teamId,
    requestId,
    access.userId,
  );
  revalidatePath("/admin/club-settings/member-registration");
}

export async function rejectMemberRegistrationAction(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const requestId = String(formData.get("requestId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "");
  if (!requestId) throw new Error("Demande invalide");
  await createClubIdentityMemberRegistrationAdapter().rejectMemberRegistration(
    teamId,
    requestId,
    access.userId,
    reason,
  );
  revalidatePath("/admin/club-settings/member-registration");
}

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) throw new Error("Email requis");
  await createClubIdentityMemberRegistrationAdapter().inviteMember({
    teamId,
    email,
    actorUserId: access.userId,
  });
  revalidatePath("/admin/club-settings/member-registration");
}
