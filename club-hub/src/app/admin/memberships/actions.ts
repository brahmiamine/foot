"use server";

import { revalidatePath } from "next/cache";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { MembershipService } from "@/services/MembershipService";
import { MEMBERSHIP_TYPE_CODES, type MembershipTypeCode } from "@/entities/Membership";
import { AuditLogService } from "@/services/AuditLogService";

function readCode(formData: FormData): MembershipTypeCode {
  const value = String(formData.get("code") ?? "");
  if (!MEMBERSHIP_TYPE_CODES.includes(value as MembershipTypeCode)) {
    throw new Error(`Code de membership invalide : ${value}`);
  }
  return value as MembershipTypeCode;
}

export async function upsertMembershipType(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const service = new MembershipService();

  const durationRaw = formData.get("durationDays");
  const rightsRaw = String(formData.get("rights") ?? "");

  const after = await service.upsertType(
    teamId,
    {
      code: readCode(formData),
      labelFr: String(formData.get("labelFr") ?? ""),
      labelAr: (formData.get("labelAr") as string) || null,
      isActive: formData.get("isActive") === "on",
      requiresApproval: formData.get("requiresApproval") === "on",
      durationDays: durationRaw && durationRaw !== "" ? Number(durationRaw) : null,
      rights: rightsRaw
        ? rightsRaw
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean)
        : null,
    },
    access.userId,
  );

  await new AuditLogService().create({
    userId: access.userId,
    action: "UPDATE",
    entity: "MembershipType",
    entityId: after.id,
    after,
  });
  revalidatePath("/admin/memberships");
}

export async function approveMembership(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const membershipId = String(formData.get("membershipId") ?? "");

  const after = await new MembershipService().approve(teamId, membershipId, access.userId);
  await new AuditLogService().create({
    userId: access.userId,
    action: "UPDATE",
    entity: "Membership",
    entityId: after.id,
    after,
  });
  revalidatePath("/admin/memberships");
}

export async function rejectMembership(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const membershipId = String(formData.get("membershipId") ?? "");
  const reason = String(formData.get("reason") ?? "");

  const after = await new MembershipService().reject(teamId, membershipId, access.userId, reason);
  await new AuditLogService().create({
    userId: access.userId,
    action: "UPDATE",
    entity: "Membership",
    entityId: after.id,
    after,
  });
  revalidatePath("/admin/memberships");
}
