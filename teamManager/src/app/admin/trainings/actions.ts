"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission, requireCategory } from "@/lib/access";
import { TrainingService } from "@/services/TrainingService";
import { TrainingInvitationService } from "@/services/TrainingInvitationService";
import { AuditLogService } from "@/services/AuditLogService";
import { createTrainingSchema, updateTrainingSchema, inviteToTrainingSchema, updateTrainingInvitationResponseSchema } from "@/types/trainings";
import type { TrainingInvitationResponse } from "@/entities/TrainingInvitation";

function readTrainingForm(formData: FormData) {
  const dateStr = formData.get("date") as string;
  return {
    category: (formData.get("category") as string) || "seniors",
    title: formData.get("title") as string,
    trainingType: (formData.get("trainingType") as string) || "AUTRE",
    date: dateStr ? new Date(dateStr) : new Date(),
    durationMinutes: formData.get("durationMinutes") ? parseInt(formData.get("durationMinutes") as string, 10) : null,
    stadiumId: formData.get("stadiumId") ? parseInt(formData.get("stadiumId") as string, 10) : null,
    venueName: (formData.get("venueName") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };
}

export async function createTraining(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "trainings.create");

    const data = createTrainingSchema.parse(readTrainingForm(formData));
    requireCategory(access, data.category);

    const teamId = await requireTeamId();
    const service = new TrainingService();
    const training = await service.create(data, teamId, session.user.id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "CREATE", entity: "Training", entityId: String(training.id) });

    revalidatePath("/admin/trainings");
    return { success: true, message: "Entraînement créé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateTraining(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "trainings.edit");

    const teamId = await requireTeamId();
    const service = new TrainingService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Entraînement non trouvé");
    requireCategory(access, existing.category);

    const raw = readTrainingForm(formData);
    const status = (formData.get("status") as string) || undefined;
    const data = updateTrainingSchema.parse({ ...raw, status });
    if (data.category) requireCategory(access, data.category);

    await service.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "Training", entityId: String(id) });

    revalidatePath("/admin/trainings");
    return { success: true, message: "Entraînement modifié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteTraining(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "trainings.delete");

    const teamId = await requireTeamId();
    const service = new TrainingService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Entraînement non trouvé");
    requireCategory(access, existing.category);

    await service.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "Training", entityId: String(id) });

    revalidatePath("/admin/trainings");
    return { success: true, message: "Entraînement supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function inviteToTraining(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "trainings.invite");

    const data = inviteToTrainingSchema.parse({
      trainingId: formData.get("trainingId") as string,
      playerIds: formData.getAll("playerIds") as string[],
    });

    const teamId = await requireTeamId();
    const trainingService = new TrainingService();
    const training = await trainingService.findById(data.trainingId, teamId);
    if (!training) throw new Error("Entraînement non trouvé");
    requireCategory(access, training.category);

    const invitationService = new TrainingInvitationService();
    const invitations = await invitationService.inviteBulk(data.trainingId, data.playerIds);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "TrainingInvitation",
      entityId: String(data.trainingId),
      after: { count: invitations.length },
    });

    revalidatePath("/admin/trainings");
    return {
      success: true,
      message: invitations.length > 0 ? `${invitations.length} joueur(s) invité(s)` : "Ces joueurs étaient déjà invités",
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'invitation" };
  }
}

export async function updateTrainingInvitationResponse(id: number, response: TrainingInvitationResponse) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "trainings.invite");

    const data = updateTrainingInvitationResponseSchema.parse({ response });
    const invitationService = new TrainingInvitationService();
    await invitationService.updateResponse(id, data.response);

    revalidatePath("/admin/trainings");
    return { success: true, message: "Réponse mise à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" };
  }
}

export async function removeTrainingInvitation(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "trainings.invite");

    const invitationService = new TrainingInvitationService();
    await invitationService.remove(id);

    revalidatePath("/admin/trainings");
    return { success: true, message: "Invitation retirée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du retrait" };
  }
}
