import { requireTeamId } from "@/lib/team-context";
import { FineService } from "@/services/FineService";
import { FinesList } from "./FinesList";
import type { FineType } from "@/entities/Fine";

export const dynamic = "force-dynamic";

const VALID_TYPES: FineType[] = ["CARD", "VIRAGE", "DIRECTOR", "DISCIPLINARY"];

/**
 * Page Amendes — port de cardManager/app/[locale]/admin/dashboard/fines
 * (+ directors/virages, ici fusionnés en filtre `?type=`).
 */
export default async function FinesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const filterType = VALID_TYPES.includes(type as FineType) ? (type as FineType) : undefined;

  const teamId = await requireTeamId();
  const fineService = new FineService();
  // Bascule les amendes PENDING échues en OVERDUE — port du fetch au montage
  // de cardManager/components/fines/FinesManager (nécessaire au blocage FTF :
  // seule une amende OVERDUE bloque la réactivation d'un joueur, pas PENDING).
  await fineService.markOverdue();
  const finesData = await fineService.findAllByTeam(teamId, filterType);

  const fines = finesData.map((f) => ({
    id: f.id,
    type: f.type,
    amount: Number(f.amount),
    reasonFr: f.reasonFr,
    status: f.status,
    dueDate: f.dueDate ? f.dueDate.toISOString() : null,
    paidAt: f.paidAt ? f.paidAt.toISOString() : null,
    directorNameFr: f.directorNameFr ?? null,
    player: f.player ? { firstNameFr: f.player.firstNameFr, lastNameFr: f.player.lastNameFr } : null,
  }));

  return <FinesList initialFines={fines} activeType={filterType} />;
}
