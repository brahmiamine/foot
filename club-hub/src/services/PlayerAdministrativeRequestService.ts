import { getDataSource } from "@/lib/database";
import { PlayerAdministrativeRequest } from "@/entities/PlayerAdministrativeRequest";

const OPEN_STATUSES = ["NEW", "IN_PROGRESS"] as const;

/** PLAYER-005 (P2) — suivi côté club des demandes administratives soumises par le joueur depuis player-hub. */
export class PlayerAdministrativeRequestService {
  async listForTeam(teamId: string): Promise<PlayerAdministrativeRequest[]> {
    const ds = await getDataSource();
    return ds.getRepository(PlayerAdministrativeRequest).find({
      where: { teamId },
      order: { createdAt: "DESC" },
    });
  }

  async listOpenForTeam(teamId: string): Promise<PlayerAdministrativeRequest[]> {
    const ds = await getDataSource();
    return ds.getRepository(PlayerAdministrativeRequest).find({
      where: OPEN_STATUSES.map((status) => ({ teamId, status })),
      order: { createdAt: "ASC" },
    });
  }

  async updateStatus(
    id: string,
    teamId: string,
    staffUserId: string,
    status: "IN_PROGRESS" | "FULFILLED" | "REJECTED",
    staffNote?: string | null,
  ): Promise<PlayerAdministrativeRequest> {
    const ds = await getDataSource();
    const repo = ds.getRepository(PlayerAdministrativeRequest);
    const request = await repo.findOne({ where: { id, teamId } });
    if (!request) throw new Error("Demande introuvable");

    request.status = status;
    request.staffUserId = staffUserId;
    request.staffNote = staffNote?.trim() || null;
    request.resolvedAt = status === "FULFILLED" || status === "REJECTED" ? new Date() : null;
    return repo.save(request);
  }
}
