import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, selectableCategories } from "@/lib/access";
import { TrainingService } from "@/services/TrainingService";
import { TrainingInvitationService } from "@/services/TrainingInvitationService";
import { PlayerService } from "@/services/PlayerService";
import { StadiumService } from "@/services/StadiumService";
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

  const [trainingsData, playersData, stadiumsData] = await Promise.all([
    trainingService.findAll(teamId, access.categories),
    playerService.findAll(teamId, access.categories),
    stadiumService.findAll(teamId),
  ]);

  const invitationsByTraining = await Promise.all(
    trainingsData.map(async (t) => ({ trainingId: t.id, invitations: await invitationService.findByTraining(t.id) }))
  );
  const invitationsMap = new Map(invitationsByTraining.map((e) => [e.trainingId, e.invitations]));

  const trainings = trainingsData.map((t) => ({
    id: t.id,
    category: t.category,
    title: t.title,
    trainingType: t.trainingType,
    date: t.date.toISOString(),
    durationMinutes: t.durationMinutes ?? null,
    stadiumId: t.stadiumId ?? null,
    stadiumName: t.stadium?.nameFr ?? null,
    venueName: t.venueName ?? null,
    notes: t.notes ?? null,
    status: t.status,
    invitations: (invitationsMap.get(t.id) ?? []).map((i) => ({
      id: i.id,
      playerId: i.playerId,
      playerLabel: i.player ? `#${i.player.number} ${i.player.firstNameFr} ${i.player.lastNameFr}` : "Joueur inconnu",
      response: i.response,
    })),
  }));

  const players = playersData.filter((p) => p.isActive).map((p) => ({ id: p.id, label: `#${p.number} ${p.firstNameFr} ${p.lastNameFr}`, category: p.category }));
  const stadiums = stadiumsData.map((s) => ({ id: s.id, nameFr: s.nameFr }));

  return (
    <TrainingsManagement
      initialTrainings={trainings}
      players={players}
      stadiums={stadiums}
      allowedCategories={selectableCategories(access, AGE_CATEGORIES)}
      canCreate={can(access, "trainings.create")}
      canEdit={can(access, "trainings.edit")}
      canDelete={can(access, "trainings.delete")}
      canInvite={can(access, "trainings.invite")}
    />
  );
}
