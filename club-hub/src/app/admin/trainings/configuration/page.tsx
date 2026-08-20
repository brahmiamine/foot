import Link from "next/link";
import { getUserAccess, can, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { TrainingService } from "@/services/TrainingService";
import { TrainingInvitationService } from "@/services/TrainingInvitationService";
import { TrainingConfigurationManager } from "./TrainingConfigurationManager";

export const dynamic = "force-dynamic";

export default async function TrainingConfigurationPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (teamId !== access.teamId) throw new Error("Contexte club invalide");
  requirePermission(access, "trainings.view");

  const service = new TrainingService();
  const invitationService = new TrainingInvitationService();
  const [trainingsData, templates] = await Promise.all([
    service.findAll(teamId, access.categories),
    service.findTemplates(teamId, access.categories),
  ]);
  const invitations = await invitationService.findByTrainingIds(trainingsData.map((training) => training.id));
  const byTraining = new Map<number, typeof invitations>();
  for (const invitation of invitations) {
    const list = byTraining.get(invitation.trainingId) ?? [];
    list.push(invitation);
    byTraining.set(invitation.trainingId, list);
  }

  const trainings = trainingsData.map((training) => {
    const rows = byTraining.get(training.id) ?? [];
    return {
      id: training.id,
      title: training.title,
      category: training.category,
      date: training.date.toISOString(),
      status: training.status,
      responseDeadline: training.responseDeadline?.toISOString() ?? null,
      reminderOffsetMinutes: training.reminderOffsetMinutes ?? 1440,
      invitationsLocked: Boolean(training.invitationsLocked),
      invitationCount: rows.length,
      rsvpPending: rows.filter((row) => row.rsvpStatus === "PENDING").length,
      rsvpAccepted: rows.filter((row) => row.rsvpStatus === "ACCEPTED").length,
      rsvpDeclined: rows.filter((row) => row.rsvpStatus === "DECLINED").length,
    };
  });

  return (
    <>
      <div className="mb-3">
        <Link href="/admin/trainings" className="btn btn-outline-secondary btn-sm">← Retour aux entraînements</Link>
      </div>
      <TrainingConfigurationManager
        trainings={trainings}
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          title: template.title,
          category: template.category,
          durationMinutes: template.durationMinutes ?? null,
          responseDeadlineOffsetMinutes: template.responseDeadlineOffsetMinutes,
          reminderOffsetMinutes: template.reminderOffsetMinutes,
        }))}
        canEdit={can(access, "trainings.edit")}
        canCreate={can(access, "trainings.create")}
      />
    </>
  );
}
