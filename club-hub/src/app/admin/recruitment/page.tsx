import { can, getUserAccess, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { RecruitmentService } from "@/services/RecruitmentService";
import { NeedsManagement } from "./NeedsManagement";

export const dynamic = "force-dynamic";

/** Admin — postes/catégories recherchés par le club, affichés sur /recrutement. */
export default async function RecruitmentPage() {
  const access = await getUserAccess();
  requirePermission(access, "recruitment.view");
  const teamId = await requireTeamId();
  if (access.teamId !== teamId) throw new Error("Action non autorisée : contexte club incohérent");

  const needs = await new RecruitmentService().findAllNeeds(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Recrutement — Postes recherchés</h1>
      <NeedsManagement
        canManage={can(access, "recruitment.manage")}
        initialNeeds={needs.map((need) => ({
          id: need.id,
          category: need.category,
          position: need.position,
          descriptionFr: need.descriptionFr ?? null,
          descriptionAr: need.descriptionAr ?? null,
          isActive: need.isActive,
          displayOrder: need.displayOrder,
        }))}
      />
    </div>
  );
}
