import { requireTeamId } from "@/lib/team-context";
import { SuspensionService } from "@/services/SuspensionService";
import { FineService } from "@/services/FineService";
import { SuspensionsList } from "./SuspensionsList";

export const dynamic = "force-dynamic";

/** Page Suspensions — port du tableau de bord disciplinaire. */
export default async function SuspensionsPage() {
  const teamId = await requireTeamId();
  const suspensionService = new SuspensionService();
  const fineService = new FineService();
  const suspensionsData = await suspensionService.findAllByTeam(teamId);
  const overduePlayerIds = await fineService.findOverduePlayerIds(
    suspensionsData.flatMap((suspension) => (suspension.playerId ? [suspension.playerId] : []))
  );

  const suspensions = suspensionsData.map((suspension) => ({
    id: suspension.id,
    reason: suspension.reason,
    matchesCount: suspension.overrideMatchesCount ?? suspension.matchesCount,
    matchesPurged: suspension.matchesPurged,
    status: suspension.status,
    disciplinaryDecision: suspension.disciplinaryDecision,
    overrideMatchesCount: suspension.overrideMatchesCount ?? null,
    createdAt:
      suspension.createdAt instanceof Date
        ? suspension.createdAt.toISOString()
        : new Date(suspension.createdAt).toISOString(),
    player: suspension.player
      ? {
          firstNameFr: suspension.player.firstNameFr,
          lastNameFr: suspension.player.lastNameFr,
          number: suspension.player.number,
        }
      : null,
    hasBlockingFine: suspension.playerId ? overduePlayerIds.has(suspension.playerId) : false,
  }));

  return <SuspensionsList initialSuspensions={suspensions} />;
}
