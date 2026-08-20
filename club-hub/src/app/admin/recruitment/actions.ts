"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUserAccess, requireCategory, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { RecruitmentService } from "@/services/RecruitmentService";
import { RecruitmentWorkflowService } from "@/services/RecruitmentWorkflowService";
import {
  normalizeRecruitmentCategory,
  recruitmentNeedSchema,
  recruitmentRejectionSchema,
  recruitmentReviewSchema,
  recruitmentTrialSchema,
} from "@/types/recruitment";

const NEEDS_PATH = "/admin/recruitment";
const APPLICATIONS_PATH = "/admin/recruitment/applications";

export interface RecruitmentActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

async function managementContext() {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifié");

  const access = await getUserAccess();
  requirePermission(access, "recruitment.manage");
  const teamId = await requireTeamId();
  if (access.teamId !== teamId) throw new Error("Action non autorisée : contexte club incohérent");

  return { access, teamId, actorId: session.user.id };
}

async function applicationContext(id: number) {
  const context = await managementContext();
  const application = await new RecruitmentService().findApplicationById(id, context.teamId);
  if (!application) throw new Error("Candidature introuvable");

  const category = normalizeRecruitmentCategory(application.category);
  if (context.access.categories !== "ALL") {
    if (!category) throw new Error("Action non autorisée : catégorie recrutement non reconnue");
    requireCategory(context.access, category);
  }

  return { ...context, application, workflow: new RecruitmentWorkflowService() };
}

function failure(error: unknown, fallback: string): RecruitmentActionResult {
  return { success: false, error: error instanceof Error ? error.message : fallback };
}

export async function createNeed(formData: FormData): Promise<RecruitmentActionResult> {
  try {
    const data = recruitmentNeedSchema.parse({
      category: formData.get("category") as string,
      position: formData.get("position") as string,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
      displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
    });
    const { teamId } = await managementContext();
    await new RecruitmentService().createNeed(teamId, data);
    revalidatePath(NEEDS_PATH);
    return { success: true, message: "Poste ajouté" };
  } catch (error) {
    return failure(error, "Erreur lors de la création");
  }
}

export async function updateNeed(id: number, formData: FormData): Promise<RecruitmentActionResult> {
  try {
    const data = recruitmentNeedSchema.parse({
      category: formData.get("category") as string,
      position: formData.get("position") as string,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
      displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
    });
    const { teamId } = await managementContext();
    await new RecruitmentService().updateNeed(id, teamId, data);
    revalidatePath(NEEDS_PATH);
    return { success: true, message: "Poste modifié" };
  } catch (error) {
    return failure(error, "Erreur lors de la modification");
  }
}

export async function deleteNeed(id: number): Promise<RecruitmentActionResult> {
  try {
    const { teamId } = await managementContext();
    await new RecruitmentService().deleteNeed(id, teamId);
    revalidatePath(NEEDS_PATH);
    return { success: true, message: "Poste supprimé" };
  } catch (error) {
    return failure(error, "Erreur lors de la suppression");
  }
}

export async function approveRecruitmentScout(id: number, formData: FormData): Promise<RecruitmentActionResult> {
  try {
    const data = recruitmentReviewSchema.parse({ notes: formData.get("notes") || null });
    const { workflow, teamId, actorId } = await applicationContext(id);
    await workflow.approveScout(id, teamId, actorId, data.notes);
    revalidatePath(APPLICATIONS_PATH);
    return { success: true, message: "Validation scout enregistrée" };
  } catch (error) {
    return failure(error, "Erreur lors de la validation scout");
  }
}

export async function approveRecruitmentCoach(id: number, formData: FormData): Promise<RecruitmentActionResult> {
  try {
    const data = recruitmentReviewSchema.parse({ notes: formData.get("notes") || null });
    const { workflow, teamId, actorId } = await applicationContext(id);
    await workflow.approveCoach(id, teamId, actorId, data.notes);
    revalidatePath(APPLICATIONS_PATH);
    return { success: true, message: "Validation coach enregistrée" };
  } catch (error) {
    return failure(error, "Erreur lors de la validation coach");
  }
}

export async function scheduleRecruitmentTrial(id: number, formData: FormData): Promise<RecruitmentActionResult> {
  try {
    const data = recruitmentTrialSchema.parse({
      scheduledAt: formData.get("scheduledAt"),
      location: formData.get("location"),
      notes: formData.get("notes") || null,
    });
    const { workflow, teamId, actorId } = await applicationContext(id);
    await workflow.scheduleTrial(id, teamId, actorId, data);
    revalidatePath(APPLICATIONS_PATH);
    return { success: true, message: "Essai planifié" };
  } catch (error) {
    return failure(error, "Erreur lors de la planification de l'essai");
  }
}

export async function approveRecruitmentTrial(id: number, formData: FormData): Promise<RecruitmentActionResult> {
  try {
    const data = recruitmentReviewSchema.parse({ notes: formData.get("notes") || null });
    const { workflow, teamId, actorId } = await applicationContext(id);
    await workflow.approveTrial(id, teamId, actorId, data.notes);
    revalidatePath(APPLICATIONS_PATH);
    return { success: true, message: "Essai validé" };
  } catch (error) {
    return failure(error, "Erreur lors de la validation de l'essai");
  }
}

export async function approveRecruitmentSportingDirector(id: number, formData: FormData): Promise<RecruitmentActionResult> {
  try {
    const data = recruitmentReviewSchema.parse({ notes: formData.get("notes") || null });
    const { workflow, teamId, actorId } = await applicationContext(id);
    await workflow.approveSportingDirector(id, teamId, actorId, data.notes);
    revalidatePath(APPLICATIONS_PATH);
    return { success: true, message: "Validation du directeur sportif enregistrée" };
  } catch (error) {
    return failure(error, "Erreur lors de la validation du directeur sportif");
  }
}

export async function startRecruitmentNegotiation(id: number, formData: FormData): Promise<RecruitmentActionResult> {
  try {
    const data = recruitmentReviewSchema.parse({ notes: formData.get("notes") || null });
    const { workflow, teamId, actorId } = await applicationContext(id);
    await workflow.startNegotiation(id, teamId, actorId, data.notes);
    revalidatePath(APPLICATIONS_PATH);
    return { success: true, message: "Négociation démarrée" };
  } catch (error) {
    return failure(error, "Erreur lors du démarrage de la négociation");
  }
}

export async function acceptRecruitmentApplication(id: number, formData: FormData): Promise<RecruitmentActionResult> {
  try {
    const data = recruitmentReviewSchema.parse({ notes: formData.get("notes") || null });
    const { workflow, teamId, actorId } = await applicationContext(id);
    await workflow.accept(id, teamId, actorId, data.notes);
    revalidatePath(APPLICATIONS_PATH);
    return { success: true, message: "Candidature acceptée" };
  } catch (error) {
    return failure(error, "Erreur lors de l'acceptation");
  }
}

export async function rejectRecruitmentApplication(id: number, formData: FormData): Promise<RecruitmentActionResult> {
  try {
    const data = recruitmentRejectionSchema.parse({ reason: formData.get("reason") });
    const { workflow, teamId, actorId } = await applicationContext(id);
    await workflow.reject(id, teamId, actorId, data.reason);
    revalidatePath(APPLICATIONS_PATH);
    return { success: true, message: "Candidature refusée" };
  } catch (error) {
    return failure(error, "Erreur lors du refus");
  }
}

export async function deleteRecruitmentApplication(id: number): Promise<RecruitmentActionResult> {
  try {
    const { workflow, teamId } = await applicationContext(id);
    await workflow.deleteNew(id, teamId);
    revalidatePath(APPLICATIONS_PATH);
    return { success: true, message: "Candidature supprimée" };
  } catch (error) {
    return failure(error, "Erreur lors de la suppression");
  }
}
