import { redirect } from "next/navigation";
import { getUserAccess, can } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { PlayerAdministrativeRequestService } from "@/services/PlayerAdministrativeRequestService";
import { AdministrativeRequests } from "./AdministrativeRequests";

export const dynamic = "force-dynamic";

/** PLAYER-005 (P2) — suivi des demandes administratives joueur (attestations/documents/rendez-vous). */
export default async function PlayerAdministrativeRequestsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "players.edit")) redirect("/admin/players");

  const requests = await new PlayerAdministrativeRequestService().listForTeam(teamId);

  return (
    <AdministrativeRequests
      requests={requests.map((request) => ({
        id: request.id,
        playerId: request.playerId,
        requestType: request.requestType,
        details: request.details,
        status: request.status,
        staffNote: request.staffNote ?? null,
        createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : new Date(request.createdAt).toISOString(),
      }))}
    />
  );
}
