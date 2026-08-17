"use server";

import { revalidatePath } from "next/cache";
import { getUserAccess, can } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { ClubApprovalService } from "@/services/ClubApprovalService";
import { AuditLogService } from "@/services/AuditLogService";
import type { ClubApprovalDomain } from "@/entities/ClubGovernance";

function canReview(domain: ClubApprovalDomain, access: Awaited<ReturnType<typeof getUserAccess>>): boolean {
  if (domain === "NEWS") return can(access, "news.publish");
  if (domain === "ANNOUNCEMENT") return can(access, "announcements.manage");
  return can(access, "shop.manage");
}

function revalidateDomain(domain: ClubApprovalDomain, entityId: string) {
  revalidatePath("/admin/approvals");
  if (domain === "NEWS") {
    revalidatePath("/admin/news");
    revalidatePath(`/admin/news/${entityId}/edit`);
    revalidatePath("/");
  } else if (domain === "ANNOUNCEMENT") {
    revalidatePath("/admin/announcements");
    revalidatePath("/communiques");
  } else {
    revalidatePath("/admin/shop/products");
    revalidatePath("/boutique");
  }
}

export async function approveClubPublication(requestId: string): Promise<void> {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  const service = new ClubApprovalService();
  const request = await service.getRequest(requestId, teamId);
  if (!request || !canReview(request.domain, access)) {
    throw new Error("Accès refusé ou demande introuvable");
  }

  const updated = await service.approve(request.id, teamId, access.userId);
  await new AuditLogService().create({
    userId: access.userId,
    action: "UPDATE",
    entity: "ClubApprovalRequest",
    entityId: request.id,
    before: { status: request.status },
    after: { status: updated.status, domain: updated.domain, entityId: updated.entityId },
  });
  revalidateDomain(updated.domain, updated.entityId);
}

export async function rejectClubPublication(requestId: string, formData: FormData): Promise<void> {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  const service = new ClubApprovalService();
  const request = await service.getRequest(requestId, teamId);
  if (!request || !canReview(request.domain, access)) {
    throw new Error("Accès refusé ou demande introuvable");
  }

  const reason = String(formData.get("reason") ?? "");
  const updated = await service.reject(request.id, teamId, access.userId, reason);
  await new AuditLogService().create({
    userId: access.userId,
    action: "UPDATE",
    entity: "ClubApprovalRequest",
    entityId: request.id,
    before: { status: request.status },
    after: { status: updated.status, rejectionReason: updated.rejectionReason },
  });
  revalidateDomain(updated.domain, updated.entityId);
}
