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
  const blocksJson = (formData.get("blocksJson") as string) || "[]";
  let blocks: unknown[] = [];
  try { blocks = JSON.parse(blocksJson); } catch { blocks = []; }
  return {
    category: (formData.get("category") as string) || "seniors",
    title: formData.get("title") as string,
    objective: (formData.get("objective") as string) || null,
    trainingType: (formData.get("trainingType") as string) || "AUTRE",
    intensity: (formData.get("intensity") as string) || null,
    date: dateStr ? new Date(dateStr) : new Date(),
    durationMinutes: formData.get("durationMinutes") ? parseInt(formData.get("durationMinutes") as string, 10) : null,
    equipment: (formData.get("equipment") as string) || null,
    stadiumId: formData.get("stadiumId") ? parseInt(formData.get("stadiumId") as string, 10) : null,
    venueName: (formData.get("venueName") as string) || null,
    notes: (formData.get("notes") as string) || null,
    blocks,
  };
}

async function secureTeamId(accessTeamId: string): Promise<string> {
  const teamId = await requireTeamId();
  if (teamId !== accessTeamId) throw new Error("Contexte club invalide");
  return teamId;
}

export async function createTraining(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");
    const access = await getUserAccess();
    requirePermission(access, "trainings.create");
    const data = createTrainingSchema.parse(readTrainingForm(formData));
    requireCategory(access, data.category);
    const teamId = await secureTeamId(access.teamId);
    const training = await new TrainingService().create(data, teamId, session.user.id);
    await new AuditLogService().create({ userId: session.user.id, action: "CREATE", entity: "Training", entityId: String(training.id) });
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
    const teamId = await secureTeamId(access.teamId);
    const service = new TrainingService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Entraînement non trouvé");
    requireCategory(access, existing.category);
    const raw = readTrainingForm(formData);
    const status = (formData.get("status") as string) || undefined;
    const data = updateTrainingSchema.parse({ ...raw, status });
    if (data.category) requireCategory(access, data.category);
    await service.update(id, teamId, data);
    await new AuditLogService().create({ userId: session.user.id, action: "UPDATE", entity: "Training", entityId: String(id) });
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
    const teamId = await secureTeamId(access.teamId);
    const service = new TrainingService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Entraînement non trouvé");
    requireCategory(access, existing.category);
    await service.delete(id, teamId);
    await new AuditLogService().create({ userId: session.user.id, action: "DELETE", entity: "Training", entityId: String(id) });
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
    const teamId = await secureTeamId(access.teamId);
    const training = await new TrainingService().findById(data.trainingId, teamId);
    if (!training) throw new Error("Entraînement non trouvé");
    requireCategory(access, training.category);
    const invitations = await new TrainingInvitationService().inviteBulk(data.trainingId, teamId, data.playerIds);
    await new AuditLogService().create({
      userId: session.user.id,
      action: "CREATE",
      entity: "TrainingInvitation",
      entityId: String(data.trainingId),
      after: { count: invitations.length },
    });
    revalidatePath("/admin/trainings");
    revalidatePath("/admin/trainings/configuration");
    return { success: true, message: invitations.length > 0 ? `${invitations.length} joueur(s) invité(s)` : "Ces joueurs étaient déjà invités" };
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
    await new TrainingInvitationService().updateResponse(id, access.teamId, data.response);
    revalidatePath("/admin/trainings");
    return { success: true, message: "Présence mise à jour" };
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
    await new TrainingInvitationService().remove(id, access.teamId);
    revalidatePath("/admin/trainings");
    revalidatePath("/admin/trainings/configuration");
    return { success: true, message: "Invitation retirée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du retrait" };
  }
}
