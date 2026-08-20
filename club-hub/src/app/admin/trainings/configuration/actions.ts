"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUserAccess, requireCategory, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { TrainingService } from "@/services/TrainingService";
import {
  createTrainingFromTemplateSchema,
  createTrainingTemplateSchema,
  updateTrainingResponsePolicySchema,
} from "@/types/trainings";

async function context() {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifié");
  const access = await getUserAccess();
  const teamId = await requireTeamId();
  if (teamId !== access.teamId) throw new Error("Contexte club invalide");
  return { session, access, teamId };
}

function refreshTrainingPages() {
  revalidatePath("/admin/trainings");
  revalidatePath("/admin/trainings/configuration");
}

export async function updateTrainingResponsePolicy(formData: FormData) {
  try {
    const { access, teamId } = await context();
    requirePermission(access, "trainings.edit");
    const deadlineValue = String(formData.get("responseDeadline") ?? "").trim();
    const data = updateTrainingResponsePolicySchema.parse({
      trainingId: formData.get("trainingId"),
      responseDeadline: deadlineValue ? new Date(deadlineValue) : null,
      reminderOffsetMinutes: Number(formData.get("reminderOffsetMinutes") ?? 1440),
    });
    const service = new TrainingService();
    const training = await service.findById(data.trainingId, teamId);
    if (!training) throw new Error("Entraînement non trouvé");
    requireCategory(access, training.category);
    await service.updateResponsePolicy(data.trainingId, teamId, {
      responseDeadline: data.responseDeadline ?? null,
      reminderOffsetMinutes: data.reminderOffsetMinutes,
    });
    refreshTrainingPages();
    return { success: true, message: "Politique de réponse enregistrée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de configuration" };
  }
}

export async function lockTrainingInvitations(trainingId: number) {
  try {
    const { session, access, teamId } = await context();
    requirePermission(access, "trainings.edit");
    const service = new TrainingService();
    const training = await service.findById(trainingId, teamId);
    if (!training) throw new Error("Entraînement non trouvé");
    requireCategory(access, training.category);
    await service.lockInvitations(trainingId, teamId, session.user.id);
    refreshTrainingPages();
    return { success: true, message: "Roster verrouillé définitivement" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de verrouillage" };
  }
}

export async function saveTrainingAsTemplate(formData: FormData) {
  try {
    const { session, access, teamId } = await context();
    requirePermission(access, "trainings.edit");
    const data = createTrainingTemplateSchema.parse({
      trainingId: formData.get("trainingId"),
      name: formData.get("name"),
    });
    const service = new TrainingService();
    const training = await service.findById(data.trainingId, teamId);
    if (!training) throw new Error("Entraînement non trouvé");
    requireCategory(access, training.category);
    await service.createTemplateFromTraining(data.trainingId, teamId, data.name, session.user.id);
    refreshTrainingPages();
    return { success: true, message: "Modèle créé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de création du modèle" };
  }
}

export async function createTrainingFromTemplate(formData: FormData) {
  try {
    const { session, access, teamId } = await context();
    requirePermission(access, "trainings.create");
    const dateValue = String(formData.get("date") ?? "").trim();
    const data = createTrainingFromTemplateSchema.parse({
      templateId: formData.get("templateId"),
      date: new Date(dateValue),
    });
    const service = new TrainingService();
    const templates = await service.findTemplates(teamId, access.categories);
    const template = templates.find((candidate) => candidate.id === data.templateId);
    if (!template) throw new Error("Modèle d'entraînement non trouvé");
    requireCategory(access, template.category);
    await service.createFromTemplate(data.templateId, teamId, data.date, session.user.id);
    refreshTrainingPages();
    return { success: true, message: "Séance créée depuis le modèle" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de génération de la séance" };
  }
}

export async function deleteTrainingTemplate(templateId: number) {
  try {
    const { access, teamId } = await context();
    requirePermission(access, "trainings.edit");
    const service = new TrainingService();
    const templates = await service.findTemplates(teamId, access.categories);
    const template = templates.find((candidate) => candidate.id === templateId);
    if (!template) throw new Error("Modèle d'entraînement non trouvé");
    requireCategory(access, template.category);
    await service.deleteTemplate(templateId, teamId);
    refreshTrainingPages();
    return { success: true, message: "Modèle supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de suppression du modèle" };
  }
}
