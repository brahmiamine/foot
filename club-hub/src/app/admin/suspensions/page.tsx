import { requireTeamId } from "@/lib/team-context";
import { SuspensionService } from "@/services/SuspensionService";
import { FineService } from "@/services/FineService";
import { SuspensionsList } from "./SuspensionsList";

export const dynamic = "force-dynamic";

/**
 * Page Suspensions — port de cardManager/app/[locale]/admin/dashboard/suspensions.
 */
export default async function SuspensionsPage() {
  const teamId = await requireTeamId();
  const suspensionService = new SuspensionService();
  const fineService = new FineService();
  const suspensionsData = await suspensionService.findAllByTeam(teamId);

  const suspensions = await Promise.all(
    suspensionsData.map(async (s) => ({
      id: s.id,
      reason: s.reason,
      matchesCount: s.overrideMatchesCount ?? s.matchesCount,
      matchesPurged: s.matchesPurged,
      status: s.status,
      disciplinaryDecision: s.disciplinaryDecision,
      overrideMatchesCount: s.overrideMatchesCount ?? null,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : new Date(s.createdAt).toISOString(),
      player: s.player
        ? { firstNameFr: s.player.firstNameFr, lastNameFr: s.player.lastNameFr, number: s.player.number }
        : null,
      hasBlockingFine: s.playerId ? await fineService.hasOverdue(s.playerId) : false,
    }))
  );

  return <SuspensionsList initialSuspensions={suspensions} />;
}
