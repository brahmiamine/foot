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

export async function approveClubPublication(requestId: string) {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  const service = new ClubApprovalService();
  const request = await service.getRequest(requestId, teamId);
  if (!request || !canReview(request.domain, access)) {
    return { success: false, error: "Accès refusé ou demande introuvable" };
  }

  try {
    const updated = await service.approve(request.id, teamId, access.user.id);
    await new AuditLogService().create({
      userId: access.user.id,
      action: "UPDATE",
      entity: "ClubApprovalRequest",
      entityId: request.id,
      before: { status: request.status },
      after: { status: updated.status, domain: updated.domain, entityId: updated.entityId },
    });
    revalidateDomain(updated.domain, updated.entityId);
    return {
      success: true,
      message:
        updated.status === "APPROVED"
          ? "Publication approuvée et publiée"
          : "Première approbation enregistrée ; une seconde est encore requise",
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur d'approbation" };
  }
}

export async function rejectClubPublication(requestId: string, formData: FormData) {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  const service = new ClubApprovalService();
  const request = await service.getRequest(requestId, teamId);
  if (!request || !canReview(request.domain, access)) {
    return { success: false, error: "Accès refusé ou demande introuvable" };
  }

  try {
    const reason = String(formData.get("reason") ?? "");
    const updated = await service.reject(request.id, teamId, access.user.id, reason);
    await new AuditLogService().create({
      userId: access.user.id,
      action: "UPDATE",
      entity: "ClubApprovalRequest",
      entityId: request.id,
      before: { status: request.status },
      after: { status: updated.status, rejectionReason: updated.rejectionReason },
    });
    revalidateDomain(updated.domain, updated.entityId);
    return { success: true, message: "Demande rejetée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de rejet" };
  }
}
