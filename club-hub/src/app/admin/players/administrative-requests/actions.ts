"use server";

import { revalidatePath } from "next/cache";
import { getUserAccess, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { PlayerAdministrativeRequestService } from "@/services/PlayerAdministrativeRequestService";

const service = new PlayerAdministrativeRequestService();

export async function updatePlayerAdministrativeRequestStatus(
  requestId: string,
  status: "IN_PROGRESS" | "FULFILLED" | "REJECTED",
  staffNote?: string,
) {
  try {
    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "players.edit");
    await service.updateStatus(requestId, teamId, access.userId, status, staffNote ?? null);
    revalidatePath("/admin/players/administrative-requests");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Mise à jour impossible" };
  }
}
