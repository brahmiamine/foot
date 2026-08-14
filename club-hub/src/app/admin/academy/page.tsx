import { AcademyService } from "@/services/AcademyService";
import { requireTeamId } from "@/lib/team-context";
import { CategoriesManagement } from "./CategoriesManagement";

export const dynamic = "force-dynamic";

/** Admin — catégories de la formation/académie (U6 -> Seniors), affichées sur /formation. */
export default async function AcademyPage() {
  const teamId = await requireTeamId();
  const categories = await new AcademyService().findAllCategories(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Formation — Catégories</h1>
      <CategoriesManagement
        initialCategories={categories.map((c) => ({
          id: c.id,
          code: c.code,
          nameFr: c.nameFr,
          nameAr: c.nameAr ?? null,
          ageRangeFr: c.ageRangeFr ?? null,
          descriptionFr: c.descriptionFr ?? null,
          descriptionAr: c.descriptionAr ?? null,
          isActive: c.isActive,
          displayOrder: c.displayOrder,
        }))}
      />
    </div>
  );
}
