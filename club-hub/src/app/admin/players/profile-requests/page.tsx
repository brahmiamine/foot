import { redirect } from "next/navigation";
import { getUserAccess, can, categoryAllowed } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { PlayerProfileChangeRequestService } from "@/services/PlayerProfileChangeRequestService";
import { PlayerProfileRequests } from "./PlayerProfileRequests";

export const dynamic = "force-dynamic";

export default async function PlayerProfileRequestsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "players.edit")) redirect("/admin/players");

  const requests = await new PlayerProfileChangeRequestService().listPendingForTeam(teamId);
  const visible = requests.filter((request) => {
    if (!request.currentCategory || !categoryAllowed(access, request.currentCategory)) return false;
    const targetCategory = request.requestedChanges.category;
    return typeof targetCategory !== "string" || categoryAllowed(access, targetCategory);
  });

  return (
    <PlayerProfileRequests
      requests={visible.map((request) => ({
        ...request,
        resolvedAt: request.resolvedAt?.toISOString() ?? null,
        createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : new Date(request.createdAt).toISOString(),
        updatedAt: request.updatedAt instanceof Date ? request.updatedAt.toISOString() : new Date(request.updatedAt).toISOString(),
      }))}
    />
  );
}
