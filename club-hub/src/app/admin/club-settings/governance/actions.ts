"use server";

import { revalidatePath } from "next/cache";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { ClubApprovalService } from "@/services/ClubApprovalService";
import { AuditLogService } from "@/services/AuditLogService";
import type { ClubApprovalMode } from "@/entities/ClubGovernance";

const MODES: ClubApprovalMode[] = ["AUTO", "SINGLE_APPROVAL", "DUAL_APPROVAL"];

function readMode(formData: FormData, key: string): ClubApprovalMode {
  const value = String(formData.get(key) ?? "");
  if (!MODES.includes(value as ClubApprovalMode)) throw new Error(`Mode invalide pour ${key}`);
  return value as ClubApprovalMode;
}

export async function updateClubGovernanceSettings(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const service = new ClubApprovalService();

  const before = await service.getSettings(teamId);
  const after = await service.updateSettings(teamId, access.userId, {
    makerCheckerEnabled: formData.get("makerCheckerEnabled") === "on",
    newsApprovalMode: readMode(formData, "newsApprovalMode"),
    newsReapprovalOnSensitiveChange: formData.get("newsReapprovalOnSensitiveChange") === "on",
    announcementDefaultApprovalMode: readMode(formData, "announcementDefaultApprovalMode"),
    announcementDecisionApprovalMode: readMode(formData, "announcementDecisionApprovalMode"),
    announcementSanctionApprovalMode: readMode(formData, "announcementSanctionApprovalMode"),
    announcementReapprovalOnSensitiveChange: formData.get("announcementReapprovalOnSensitiveChange") === "on",
    shopProductApprovalMode: readMode(formData, "shopProductApprovalMode"),
    shopProductReapprovalOnSensitiveChange: formData.get("shopProductReapprovalOnSensitiveChange") === "on",
  });

  await new AuditLogService().create({
    userId: access.userId,
    action: "UPDATE",
    entity: "ClubGovernanceSettings",
    entityId: teamId,
    before,
    after,
  });
  revalidatePath("/admin/club-settings/governance");
  revalidatePath("/admin/approvals");
}
