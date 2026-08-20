"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUserAccess, requireCategory, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { PlayerApplicationService, normalizeAcademyCategory } from "@/services/PlayerApplicationService";
import {
  academyApprovalSchema,
  academyCreatePlayerSchema,
  academyPreScreenSchema,
  academyRejectionSchema,
  academyTrialSchema,
} from "@/types/applications";

const PATH = "/admin/academy/applications";

async function context(id: number, permissions: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifié");

  const access = await getUserAccess();
  const teamId = await requireTeamId();
  if (access.teamId !== teamId) throw new Error("Action non autorisée : contexte club incohérent");
  for (const permission of permissions) requirePermission(access, permission);

  const service = new PlayerApplicationService();
  const application = await service.findById(id, teamId);
  if (!application) throw new Error("Candidature introuvable");

  const category = normalizeAcademyCategory(application.category);
  if (access.categories !== "ALL") {
    if (!category) throw new Error("Action non autorisée : catégorie candidature non reconnue");
    requireCategory(access, category);
  }

  return { service, teamId, actorId: session.user.id };
}

function resultError(error: unknown) {
  return { success: false, error: error instanceof Error ? error.message : "Erreur lors du traitement de la candidature" };
}

export async function preScreenPlayerApplication(id: number, formData: FormData) {
  try {
    const data = academyPreScreenSchema.parse({ notes: formData.get("notes") || null });
    const { service, teamId, actorId } = await context(id, ["playerApplications.manage"]);
    await service.preScreen(id, teamId, actorId, data.notes);
    revalidatePath(PATH);
    return { success: true, message: "Pré-sélection validée" };
  } catch (error) {
    return resultError(error);
  }
}

export async function schedulePlayerApplicationTrial(id: number, formData: FormData) {
  try {
    const data = academyTrialSchema.parse({
      scheduledAt: formData.get("scheduledAt"),
      location: formData.get("location"),
      notes: formData.get("notes") || null,
    });
    const { service, teamId, actorId } = await context(id, ["playerApplications.manage"]);
    await service.scheduleTrial(id, teamId, actorId, data);
    revalidatePath(PATH);
    return { success: true, message: "Essai planifié" };
  } catch (error) {
    return resultError(error);
  }
}

export async function approvePlayerApplicationTechnical(id: number, formData: FormData) {
  try {
    const data = academyApprovalSchema.parse({ notes: formData.get("notes") || null });
    const { service, teamId, actorId } = await context(id, ["playerApplications.manage"]);
    await service.approveTechnical(id, teamId, actorId, data.notes);
    revalidatePath(PATH);
    return { success: true, message: "Validation technique enregistrée" };
  } catch (error) {
    return resultError(error);
  }
}

export async function approvePlayerApplicationAdministrative(id: number, formData: FormData) {
  try {
    const data = academyApprovalSchema.parse({ notes: formData.get("notes") || null });
    const { service, teamId, actorId } = await context(id, ["playerApplications.manage", "players.create"]);
    await service.approveAdministrative(id, teamId, actorId, data.notes);
    revalidatePath(PATH);
    return { success: true, message: "Validation administrative enregistrée" };
  } catch (error) {
    return resultError(error);
  }
}

export async function rejectPlayerApplication(id: number, formData: FormData) {
  try {
    const data = academyRejectionSchema.parse({ reason: formData.get("reason") });
    const { service, teamId, actorId } = await context(id, ["playerApplications.manage"]);
    await service.reject(id, teamId, actorId, data.reason);
    revalidatePath(PATH);
    return { success: true, message: "Candidature refusée" };
  } catch (error) {
    return resultError(error);
  }
}

export async function createPlayerFromApplication(id: number, formData: FormData) {
  try {
    const data = academyCreatePlayerSchema.parse({
      number: formData.get("number"),
      category: formData.get("category"),
      position: formData.get("position") || null,
    });
    const { service, teamId, actorId } = await context(id, ["playerApplications.manage", "players.create"]);
    const player = await service.createPlayer(id, teamId, actorId, data);
    revalidatePath(PATH);
    revalidatePath("/admin/players");
    return { success: true, message: "Joueur créé depuis la candidature", playerId: player.id };
  } catch (error) {
    return resultError(error);
  }
}

export async function deletePlayerApplication(id: number) {
  try {
    const { service, teamId } = await context(id, ["playerApplications.manage"]);
    await service.delete(id, teamId);
    revalidatePath(PATH);
    return { success: true, message: "Candidature supprimée" };
  } catch (error) {
    return resultError(error);
  }
}
