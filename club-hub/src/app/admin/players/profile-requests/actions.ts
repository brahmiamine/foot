"use server";

import { revalidatePath } from "next/cache";
import { getUserAccess, requireCategory, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { AuditLogService } from "@/services/AuditLogService";
import { PlayerProfileChangeRequestService } from "@/services/PlayerProfileChangeRequestService";

const service = new PlayerProfileChangeRequestService();

async function requireRequestAccess(requestId: string) {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  requirePermission(access, "players.edit");
  const request = await service.findById(requestId, teamId);
  if (!request) throw new Error("Demande introuvable");
  if (!request.currentCategory) throw new Error("Catégorie joueur introuvable");
  requireCategory(access, request.currentCategory);
  const targetCategory = request.requestedChanges.category;
  if (typeof targetCategory === "string") requireCategory(access, targetCategory);
  return { teamId, access, request };
}

export async function approvePlayerProfileRequest(requestId: string) {
  try {
    const { teamId, access } = await requireRequestAccess(requestId);
    const result = await service.approve(requestId, teamId, access.userId);
    await new AuditLogService().create({
      userId: access.userId,
      action: "UPDATE",
      entity: "PlayerProfileChangeRequest",
      entityId: requestId,
      details: JSON.stringify({ status: result.status, playerId: result.playerId }),
    });
    revalidatePath("/admin/players");
    revalidatePath("/admin/players/profile-requests");
    return { success: true, status: result.status };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Approbation impossible" };
  }
}

export async function rejectPlayerProfileRequest(requestId: string, reason: string) {
  try {
    const { teamId, access } = await requireRequestAccess(requestId);
    const result = await service.reject(requestId, teamId, access.userId, reason);
    await new AuditLogService().create({
      userId: access.userId,
      action: "UPDATE",
      entity: "PlayerProfileChangeRequest",
      entityId: requestId,
      details: JSON.stringify({ status: result.status, playerId: result.playerId, reason: result.reviewReason }),
    });
    revalidatePath("/admin/players/profile-requests");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Rejet impossible" };
  }
}
