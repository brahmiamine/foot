"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission, requireCategory } from "@/lib/access";
import { EvaluationService } from "@/services/EvaluationService";
import { PlayerService } from "@/services/PlayerService";
import { createEvaluationSchema, createObjectiveSchema } from "@/types/evaluations";

async function requirePlayerCategoryAccess(teamId: string, playerId: string, access: Awaited<ReturnType<typeof getUserAccess>>) {
  const playerService = new PlayerService();
  const player = await playerService.findById(playerId, teamId);
  if (!player) throw new Error("Joueur non trouvé");
  requireCategory(access, player.category);
}

export async function createEvaluation(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "evaluations.manage");

    const data = createEvaluationSchema.parse({
      playerId: formData.get("playerId") as string,
      seasonId: formData.get("seasonId") ? parseInt(formData.get("seasonId") as string, 10) : null,
      evaluationDate: formData.get("evaluationDate") as string,
      technicalScore: (formData.get("technicalScore") as string) || null,
      tacticalScore: (formData.get("tacticalScore") as string) || null,
      physicalScore: (formData.get("physicalScore") as string) || null,
      mentalScore: (formData.get("mentalScore") as string) || null,
      comment: (formData.get("comment") as string) || null,
    });
    await requirePlayerCategoryAccess(teamId, data.playerId, access);

    const service = new EvaluationService();
    await service.createEvaluation(data, teamId, session.user.id);

    revalidatePath("/admin/evaluations");
    return { success: true, message: "Évaluation enregistrée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

export async function deleteEvaluation(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "evaluations.manage");

    const service = new EvaluationService();
    await service.deleteEvaluation(id, teamId);

    revalidatePath("/admin/evaluations");
    return { success: true, message: "Évaluation supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function createObjective(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "evaluations.manage");

    const data = createObjectiveSchema.parse({
      playerId: formData.get("playerId") as string,
      evaluationId: formData.get("evaluationId") ? parseInt(formData.get("evaluationId") as string, 10) : null,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      targetDate: (formData.get("targetDate") as string) || null,
    });
    await requirePlayerCategoryAccess(teamId, data.playerId, access);

    const service = new EvaluationService();
    await service.createObjective(data, teamId);

    revalidatePath("/admin/evaluations");
    return { success: true, message: "Objectif créé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function setObjectiveStatus(id: number, status: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "evaluations.manage");

    const service = new EvaluationService();
    await service.setObjectiveStatus(id, teamId, status as "IN_PROGRESS" | "ACHIEVED" | "MISSED");

    revalidatePath("/admin/evaluations");
    return { success: true, message: "Statut mis à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur" };
  }
}

export async function deleteObjective(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "evaluations.manage");

    const service = new EvaluationService();
    await service.deleteObjective(id, teamId);

    revalidatePath("/admin/evaluations");
    return { success: true, message: "Objectif supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
