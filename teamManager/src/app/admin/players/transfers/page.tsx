import { requireTeamId } from "@/lib/team-context";
import { PlayerTransferService } from "@/services/PlayerTransferService";
import { TransfersHistoryList } from "./TransfersHistoryList";

export const dynamic = "force-dynamic";

/**
 * Historique des transferts (entrées/sorties) du club — lecture seule, la
 * table `player_transfers` est possédée par `superadmin` (voir
 * services/PlayerTransferService.ts). Le transfert lui-même s'effectue
 * uniquement depuis superadmin (/admin/players).
 */
export default async function PlayerTransfersPage() {
  const teamId = await requireTeamId();
  const service = new PlayerTransferService();
  const transfersData = await service.listForTeam(teamId);

  const transfers = transfersData.map((t) => ({
    ...t,
    transferredAt: t.transferredAt instanceof Date ? t.transferredAt.toISOString() : new Date(t.transferredAt).toISOString(),
  }));

  return <TransfersHistoryList transfers={transfers} />;
}
