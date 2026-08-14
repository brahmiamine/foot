import { RecruitmentService } from "@/services/RecruitmentService";
import { requireTeamId } from "@/lib/team-context";
import { NeedsManagement } from "./NeedsManagement";

export const dynamic = "force-dynamic";

/** Admin — postes/catégories recherchés par le club, affichés sur /recrutement. */
export default async function RecruitmentPage() {
  const teamId = await requireTeamId();
  const needs = await new RecruitmentService().findAllNeeds(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Recrutement — Postes recherchés</h1>
      <NeedsManagement
        initialNeeds={needs.map((n) => ({
          id: n.id,
          category: n.category,
          position: n.position,
          descriptionFr: n.descriptionFr ?? null,
          descriptionAr: n.descriptionAr ?? null,
          isActive: n.isActive,
          displayOrder: n.displayOrder,
        }))}
      />
    </div>
  );
}
