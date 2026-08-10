"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission, requireCategory } from "@/lib/access";
import { InjuryService } from "@/services/InjuryService";
import { PlayerService } from "@/services/PlayerService";
import { AuditLogService } from "@/services/AuditLogService";
import { createInjurySchema, updateInjurySchema } from "@/types/injuries";

function readInjuryForm(formData: FormData) {
  return {
    playerId: formData.get("playerId") as string,
    injuryDate: formData.get("injuryDate") as string,
    zone: formData.get("zone") as string,
    severity: (formData.get("severity") as string) || "MINOR",
    description: (formData.get("description") as string) || null,
    diagnosis: (formData.get("diagnosis") as string) || null,
    unavailabilityDays: formData.get("unavailabilityDays") ? parseInt(formData.get("unavailabilityDays") as string, 10) : null,
    expectedReturnDate: (formData.get("expectedReturnDate") as string) || null,
    actualReturnDate: (formData.get("actualReturnDate") as string) || null,
    progressiveReturn: formData.get("progressiveReturn") === "on",
    progressiveReturnNotes: (formData.get("progressiveReturnNotes") as string) || null,
    documents: JSON.parse((formData.get("documentsJson") as string) || "[]"),
    status: (formData.get("status") as string) || "ONGOING",
    availabilityStatus: (formData.get("availabilityStatus") as string) || "UNAVAILABLE",
    notes: (formData.get("notes") as string) || null,
  };
}

export async function createInjury(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "medical.manage");

    const data = createInjurySchema.parse(readInjuryForm(formData));

    const teamId = await requireTeamId();
    const playerService = new PlayerService();
    const player = await playerService.findById(data.playerId, teamId);
    if (!player) throw new Error("Joueur non trouvé");
    requireCategory(access, player.category);

    const service = new InjuryService();
    const injury = await service.create(data, teamId, session.user.id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "CREATE", entity: "Injury", entityId: String(injury.id) });

    revalidatePath("/admin/injuries");
    return { success: true, message: "Dossier de blessure créé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateInjury(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "medical.manage");

    const teamId = await requireTeamId();
    const service = new InjuryService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Dossier de blessure non trouvé");
    requireCategory(access, existing.player.category);

    const data = updateInjurySchema.parse(readInjuryForm(formData));
    await service.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "Injury", entityId: String(id) });

    revalidatePath("/admin/injuries");
    return { success: true, message: "Dossier de blessure modifié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteInjury(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "medical.manage");

    const teamId = await requireTeamId();
    const service = new InjuryService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Dossier de blessure non trouvé");
    requireCategory(access, existing.player.category);

    await service.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "Injury", entityId: String(id) });

    revalidatePath("/admin/injuries");
    return { success: true, message: "Dossier de blessure supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
