import { redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, selectableCategories } from "@/lib/access";
import { InternalTeamService } from "@/services/InternalTeamService";
import { SeasonService } from "@/services/SeasonService";
import { AGE_CATEGORIES } from "@/types/categories";
import { SquadsManagement } from "./SquadsManagement";

export const dynamic = "force-dynamic";

/** Page Équipes internes — ex: "U17 A", "U17 B" (distinct de `teams`, le référentiel de club). */
export default async function SquadsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "structure.view") && !can(access, "structure.manage")) {
    redirect("/admin");
  }

  const squadService = new InternalTeamService();
  const seasonService = new SeasonService();

  const [squadsData, seasonsData] = await Promise.all([squadService.findAll(teamId), seasonService.findAll(teamId)]);

  const squads = squadsData
    .filter((s) => access.categories === "ALL" || access.categories.includes(s.category))
    .map((s) => ({
      id: s.id,
      seasonId: s.seasonId ?? null,
      seasonName: s.season?.name ?? null,
      name: s.name,
      category: s.category,
      gender: s.gender,
      code: s.code ?? null,
      status: s.status,
    }));

  const seasons = seasonsData.map((s) => ({ id: s.id, name: s.name }));

  return (
    <SquadsManagement
      initialSquads={squads}
      seasons={seasons}
      allowedCategories={selectableCategories(access, AGE_CATEGORIES)}
      canManage={can(access, "structure.manage")}
    />
  );
}
