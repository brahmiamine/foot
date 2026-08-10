import { redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { InjuryService } from "@/services/InjuryService";
import { PlayerService } from "@/services/PlayerService";
import { InjuriesManagement } from "./InjuriesManagement";

export const dynamic = "force-dynamic";

/**
 * Page Blessures & santé — module à accès strictement restreint
 * (permission medical.view / medical.manage), non accordé par défaut aux
 * coachs/adjoints.
 */
export default async function InjuriesPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "medical.view") && !can(access, "medical.manage")) {
    redirect("/admin");
  }

  const injuryService = new InjuryService();
  const playerService = new PlayerService();

  const [injuriesData, playersData] = await Promise.all([
    injuryService.findAll(teamId, access.categories),
    playerService.findAll(teamId, access.categories),
  ]);

  const injuries = injuriesData.map((i) => ({
    id: i.id,
    playerId: i.playerId,
    playerLabel: i.player ? `#${i.player.number} ${i.player.firstNameFr} ${i.player.lastNameFr}` : "Joueur inconnu",
    injuryDate: i.injuryDate,
    zone: i.zone,
    severity: i.severity,
    description: i.description ?? null,
    diagnosis: i.diagnosis ?? null,
    unavailabilityDays: i.unavailabilityDays ?? null,
    expectedReturnDate: i.expectedReturnDate ?? null,
    actualReturnDate: i.actualReturnDate ?? null,
    progressiveReturn: i.progressiveReturn,
    progressiveReturnNotes: i.progressiveReturnNotes ?? null,
    documents: InjuryService.parseDocuments(i),
    status: i.status,
    availabilityStatus: i.availabilityStatus,
    notes: i.notes ?? null,
    createdAt: i.createdAt.toISOString(),
  }));

  const players = playersData.map((p) => ({ id: p.id, label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}` }));

  return <InjuriesManagement initialInjuries={injuries} players={players} canManage={can(access, "medical.manage")} />;
}
