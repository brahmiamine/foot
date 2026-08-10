"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { CompetitionService } from "@/services/CompetitionService";
import { AuditLogService } from "@/services/AuditLogService";
import { createCompetitionSchema, updateCompetitionSchema, addCompetitionParticipantSchema } from "@/types/competitions";

function readCompetitionForm(formData: FormData) {
  return {
    name: formData.get("name") as string,
    type: (formData.get("type") as string) || "TOURNAMENT",
    category: (formData.get("category") as string) || null,
    format: (formData.get("format") as string) || "LEAGUE",
    pointsWin: formData.get("pointsWin") ? parseInt(formData.get("pointsWin") as string, 10) : 3,
    pointsDraw: formData.get("pointsDraw") ? parseInt(formData.get("pointsDraw") as string, 10) : 1,
    pointsLoss: formData.get("pointsLoss") ? parseInt(formData.get("pointsLoss") as string, 10) : 0,
    seasonId: formData.get("seasonId") ? parseInt(formData.get("seasonId") as string, 10) : null,
    startDate: (formData.get("startDate") as string) || null,
    endDate: (formData.get("endDate") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };
}

export async function createCompetition(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "competitions.manage");

    const data = createCompetitionSchema.parse(readCompetitionForm(formData));
    const service = new CompetitionService();
    const competition = await service.create(data, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "Competition",
      entityId: String(competition.id),
      after: { name: competition.name },
    });

    revalidatePath("/admin/competitions");
    return { success: true, message: "Compétition créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateCompetition(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "competitions.manage");

    const raw = readCompetitionForm(formData);
    const status = (formData.get("status") as string) || undefined;
    const data = updateCompetitionSchema.parse({ ...raw, status });

    const service = new CompetitionService();
    await service.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "Competition", entityId: String(id) });

    revalidatePath("/admin/competitions");
    return { success: true, message: "Compétition modifiée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteCompetition(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "competitions.manage");

    const service = new CompetitionService();
    await service.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "Competition", entityId: String(id) });

    revalidatePath("/admin/competitions");
    return { success: true, message: "Compétition supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function addCompetitionParticipant(competitionId: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "competitions.manage");

    const data = addCompetitionParticipantSchema.parse({
      internalTeamId: formData.get("internalTeamId") ? parseInt(formData.get("internalTeamId") as string, 10) : null,
      externalTeamId: (formData.get("externalTeamId") as string) || null,
      externalName: (formData.get("externalName") as string) || null,
    });

    const service = new CompetitionService();
    await service.addParticipant(competitionId, data);

    revalidatePath("/admin/competitions");
    return { success: true, message: "Participant ajouté" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'ajout" };
  }
}

export async function removeCompetitionParticipant(competitionId: number, participantId: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "competitions.manage");

    const service = new CompetitionService();
    await service.removeParticipant(participantId, competitionId);

    revalidatePath("/admin/competitions");
    return { success: true, message: "Participant retiré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du retrait" };
  }
}
