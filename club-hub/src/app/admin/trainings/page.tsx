import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, selectableCategories } from "@/lib/access";
import { TrainingService } from "@/services/TrainingService";
import { TrainingInvitationService } from "@/services/TrainingInvitationService";
import { PlayerService } from "@/services/PlayerService";
import { StadiumService } from "@/services/StadiumService";
import { TacticsBoardService } from "@/services/TacticsBoardService";
import { AGE_CATEGORIES } from "@/types/categories";
import { TrainingsManagement } from "./TrainingsManagement";

export const dynamic = "force-dynamic";

/** Page Entraînements — planning des séances par catégorie + invitations joueurs. */
export default async function TrainingsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();

  const trainingService = new TrainingService();
  const invitationService = new TrainingInvitationService();
  const playerService = new PlayerService();
  const stadiumService = new StadiumService();
  const tacticsBoardService = new TacticsBoardService();

  const [trainingsData, playersData, stadiumsData, tacticsBoardsData] = await Promise.all([
    trainingService.findAll(teamId, access.categories),
    playerService.findAll(teamId, access.categories),
    stadiumService.findAll(teamId),
    tacticsBoardService.findVisible(teamId, access.userId),
  ]);

  const [invitationsByTraining, blocksByTraining] = await Promise.all([
    Promise.all(trainingsData.map(async (t) => ({ trainingId: t.id, invitations: await invitationService.findByTraining(t.id) }))),
    Promise.all(trainingsData.map(async (t) => ({ trainingId: t.id, blocks: await trainingService.findBlocks(t.id) }))),
  ]);
  const invitationsMap = new Map(invitationsByTraining.map((e) => [e.trainingId, e.invitations]));
  const blocksMap = new Map(blocksByTraining.map((e) => [e.trainingId, e.blocks]));

  const trainings = trainingsData.map((t) => ({
    id: t.id,
    category: t.category,
    title: t.title,
    objective: t.objective ?? null,
    trainingType: t.trainingType,
    intensity: t.intensity ?? null,
    date: t.date.toISOString(),
    durationMinutes: t.durationMinutes ?? null,
    equipment: t.equipment ?? null,
    stadiumId: t.stadiumId ?? null,
    stadiumName: t.stadium?.nameFr ?? null,
    venueName: t.venueName ?? null,
    notes: t.notes ?? null,
    status: t.status,
    blocks: (blocksMap.get(t.id) ?? []).map((b) => ({
      blockType: b.blockType,
      label: b.label,
      durationMinutes: b.durationMinutes,
      notes: b.notes ?? null,
      tacticsBoardId: b.tacticsBoardId ?? null,
      tacticsBoardTitle: b.tacticsBoard?.title ?? null,
    })),
    invitations: (invitationsMap.get(t.id) ?? []).map((i) => ({
      id: i.id,
      playerId: i.playerId,
      playerLabel: i.player ? `#${i.player.number} ${i.player.firstNameFr} ${i.player.lastNameFr}` : "Joueur inconnu",
      response: i.response,
    })),
  }));

  const players = playersData.filter((p) => p.isActive).map((p) => ({ id: p.id, label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}`, category: p.category }));
  const stadiums = stadiumsData.map((s) => ({ id: s.id, nameFr: s.nameFr }));
  const tacticsBoards = tacticsBoardsData.map((b) => ({ id: b.id, title: b.title }));

  return (
    <TrainingsManagement
      initialTrainings={trainings}
      players={players}
      stadiums={stadiums}
      tacticsBoards={tacticsBoards}
      allowedCategories={selectableCategories(access, AGE_CATEGORIES)}
      canCreate={can(access, "trainings.create")}
      canEdit={can(access, "trainings.edit")}
      canDelete={can(access, "trainings.delete")}
      canInvite={can(access, "trainings.invite")}
    />
  );
}
