import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, categoryAllowed } from "@/lib/access";
import { EvaluationService } from "@/services/EvaluationService";
import { PlayerService } from "@/services/PlayerService";
import { SeasonService } from "@/services/SeasonService";
import { EvaluationsManagement } from "./EvaluationsManagement";

export const dynamic = "force-dynamic";

/** Page Évaluations joueurs — suivi de la progression (technique/tactique/physique/mentale) et objectifs individuels. */
export default async function EvaluationsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();

  const evaluationService = new EvaluationService();
  const playerService = new PlayerService();
  const seasonService = new SeasonService();

  const [evaluationsData, objectivesData, playersData, seasonsData] = await Promise.all([
    evaluationService.findAllEvaluations(teamId),
    evaluationService.findAllObjectives(teamId),
    playerService.findAll(teamId, access.categories),
    seasonService.findAll(teamId),
  ]);

  const visibleEvaluations = evaluationsData.filter((e) => e.player && categoryAllowed(access, e.player.category));
  const visibleObjectives = objectivesData.filter((o) => o.player && categoryAllowed(access, o.player.category));

  const evaluations = visibleEvaluations.map((e) => ({
    id: e.id,
    playerId: e.playerId,
    playerName: `${e.player.firstNameFr} ${e.player.lastNameFr}`,
    evaluationDate: e.evaluationDate,
    technicalScore: e.technicalScore ?? null,
    tacticalScore: e.tacticalScore ?? null,
    physicalScore: e.physicalScore ?? null,
    mentalScore: e.mentalScore ?? null,
    comment: e.comment ?? null,
  }));

  const objectives = visibleObjectives.map((o) => ({
    id: o.id,
    playerId: o.playerId,
    playerName: `${o.player.firstNameFr} ${o.player.lastNameFr}`,
    title: o.title,
    description: o.description ?? null,
    targetDate: o.targetDate ?? null,
    status: o.status,
  }));

  const players = playersData.map((p) => ({ id: p.id, label: `${p.firstNameFr} ${p.lastNameFr}` }));
  const seasons = seasonsData.map((s) => ({ id: s.id, name: s.name }));

  return (
    <EvaluationsManagement
      initialEvaluations={evaluations}
      initialObjectives={objectives}
      players={players}
      seasons={seasons}
      canManage={can(access, "evaluations.manage")}
    />
  );
}
