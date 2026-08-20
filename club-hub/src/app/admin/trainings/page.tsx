import Link from "next/link";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, requirePermission, selectableCategories } from "@/lib/access";
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
  if (teamId !== access.teamId) throw new Error("Contexte club invalide");
  requirePermission(access, "trainings.view");

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

  const trainingIds = trainingsData.map((training) => training.id);
  const [invitations, blocks] = await Promise.all([
    invitationService.findByTrainingIds(trainingIds),
    trainingService.findBlocksByTrainingIds(trainingIds),
  ]);

  const invitationsMap = new Map<number, typeof invitations>();
  for (const invitation of invitations) {
    const current = invitationsMap.get(invitation.trainingId) ?? [];
    current.push(invitation);
    invitationsMap.set(invitation.trainingId, current);
  }

  const blocksMap = new Map<number, typeof blocks>();
  for (const block of blocks) {
    const current = blocksMap.get(block.trainingId) ?? [];
    current.push(block);
    blocksMap.set(block.trainingId, current);
  }

  const trainings = trainingsData.map((training) => ({
    id: training.id,
    category: training.category,
    title: training.title,
    objective: training.objective ?? null,
    trainingType: training.trainingType,
    intensity: training.intensity ?? null,
    date: training.date.toISOString(),
    durationMinutes: training.durationMinutes ?? null,
    equipment: training.equipment ?? null,
    stadiumId: training.stadiumId ?? null,
    stadiumName: training.stadium?.nameFr ?? null,
    venueName: training.venueName ?? null,
    notes: training.notes ?? null,
    status: training.status,
    blocks: (blocksMap.get(training.id) ?? []).map((block) => ({
      blockType: block.blockType,
      label: block.label,
      durationMinutes: block.durationMinutes,
      notes: block.notes ?? null,
      tacticsBoardId: block.tacticsBoardId ?? null,
      tacticsBoardTitle: block.tacticsBoard?.title ?? null,
    })),
    invitations: (invitationsMap.get(training.id) ?? []).map((invitation) => ({
      id: invitation.id,
      playerId: invitation.playerId,
      playerLabel: invitation.player
        ? `#${invitation.player.number} ${invitation.player.firstNameFr} ${invitation.player.lastNameFr}`
        : "Joueur inconnu",
      response: invitation.response,
    })),
  }));

  const players = playersData
    .filter((player) => player.isActive)
    .map((player) => ({
      id: player.id,
      label: `#${player.number} ${player.firstNameFr} ${player.lastNameFr}`,
      category: player.category,
    }));
  const stadiums = stadiumsData.map((stadium) => ({ id: stadium.id, nameFr: stadium.nameFr }));
  const tacticsBoards = tacticsBoardsData.map((board) => ({ id: board.id, title: board.title }));

  return (
    <>
      <div className="mb-3 d-flex justify-content-end">
        <Link href="/admin/trainings/configuration" className="btn btn-outline-primary btn-sm">
          Deadlines, rappels & modèles
        </Link>
      </div>
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
    </>
  );
}
