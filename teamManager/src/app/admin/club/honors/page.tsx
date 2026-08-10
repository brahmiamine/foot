import { ClubContentService } from "@/services/ClubContentService";
import { requireTeamId } from "@/lib/team-context";
import { HonorsManagement } from "./HonorsManagement";

export const dynamic = "force-dynamic";

/** Admin — palmarès du club (titres, coupes, records), affiché sur /club/histoire. */
export default async function ClubHonorsPage() {
  const teamId = await requireTeamId();
  const honors = await new ClubContentService().findAllHonors(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Le club — Palmarès</h1>
      <HonorsManagement
        initialHonors={honors.map((h) => ({
          id: h.id,
          competitionFr: h.competitionFr,
          competitionAr: h.competitionAr ?? null,
          titleCount: h.titleCount,
          yearsFr: h.yearsFr ?? null,
          icon: h.icon ?? null,
          displayOrder: h.displayOrder,
        }))}
      />
    </div>
  );
}
