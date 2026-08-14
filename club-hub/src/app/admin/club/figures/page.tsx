import { ClubContentService } from "@/services/ClubContentService";
import { requireTeamId } from "@/lib/team-context";
import { FiguresManagement } from "./FiguresManagement";

export const dynamic = "force-dynamic";

/** Admin — grandes figures du club (présidents, entraîneurs, joueurs, équipes historiques). */
export default async function ClubFiguresPage() {
  const teamId = await requireTeamId();
  const figures = await new ClubContentService().findAllFigures(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Le club — Grandes figures</h1>
      <FiguresManagement
        initialFigures={figures.map((f) => ({
          id: f.id,
          category: f.category,
          nameFr: f.nameFr,
          nameAr: f.nameAr ?? null,
          periodFr: f.periodFr ?? null,
          descriptionFr: f.descriptionFr ?? null,
          descriptionAr: f.descriptionAr ?? null,
          photoUrl: f.photoUrl ?? null,
          displayOrder: f.displayOrder,
        }))}
      />
    </div>
  );
}
