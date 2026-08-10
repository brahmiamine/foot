import { redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { SeasonService } from "@/services/SeasonService";
import { SeasonsManagement } from "./SeasonsManagement";

export const dynamic = "force-dynamic";

/** Page Saisons — saison interne du club (distincte des saisons fédérales officielles). */
export default async function SeasonsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "structure.view") && !can(access, "structure.manage")) {
    redirect("/admin");
  }

  const service = new SeasonService();
  await service.ensureDefaultSeason(teamId);
  const seasonsData = await service.findAll(teamId);

  const seasons = seasonsData.map((s) => ({
    id: s.id,
    name: s.name,
    startDate: s.startDate ?? null,
    endDate: s.endDate ?? null,
    status: s.status,
    isCurrent: s.isCurrent,
  }));

  return <SeasonsManagement initialSeasons={seasons} canManage={can(access, "structure.manage")} />;
}
