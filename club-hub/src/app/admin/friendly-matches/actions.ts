"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission, requireCategory } from "@/lib/access";
import { FriendlyMatchService } from "@/services/FriendlyMatchService";
import { TeamService } from "@/services/TeamService";
import { AuditLogService } from "@/services/AuditLogService";
import { createFriendlyMatchSchema, updateFriendlyMatchSchema, setFriendlyMatchResultSchema } from "@/types/friendly-matches";

function readFriendlyMatchForm(formData: FormData) {
  const opponentTeamId = (formData.get("opponentTeamId") as string) || null;
  const dateStr = formData.get("date") as string;
  return {
    category: (formData.get("category") as string) || "seniors",
    opponentTeamId,
    opponentName: opponentTeamId ? null : (formData.get("opponentName") as string) || null,
    opponentLogoUrl: opponentTeamId ? null : (formData.get("opponentLogoUrl") as string) || null,
    isHome: formData.get("isHome") === "on",
    stadiumId: formData.get("stadiumId") ? parseInt(formData.get("stadiumId") as string, 10) : null,
    venueName: (formData.get("venueName") as string) || null,
    date: dateStr ? new Date(dateStr) : new Date(),
    notes: (formData.get("notes") as string) || null,
  };
}

export async function createFriendlyMatch(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const opponentNewName = (formData.get("opponentNewName") as string) || "";
    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "friendlyMatches.create");

    let raw = readFriendlyMatchForm(formData);
    if (!raw.opponentTeamId && opponentNewName.trim()) {
      const teamService = new TeamService();
      const created = await teamService.createExternal({ nom: opponentNewName.trim() });
      raw = { ...raw, opponentTeamId: created.id, opponentName: null };
    }

    const data = createFriendlyMatchSchema.parse(raw);
    requireCategory(access, data.category);

    const service = new FriendlyMatchService();
    const match = await service.create(data, teamId, session.user.id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "FriendlyMatch",
      entityId: String(match.id),
      after: { category: data.category, date: data.date },
    });

    revalidatePath("/admin/friendly-matches");
    return { success: true, message: "Match amical créé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateFriendlyMatch(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const opponentNewName = (formData.get("opponentNewName") as string) || "";
    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "friendlyMatches.edit");

    const service = new FriendlyMatchService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Match amical non trouvé");
    requireCategory(access, existing.category);

    let raw = readFriendlyMatchForm(formData);
    if (!raw.opponentTeamId && opponentNewName.trim()) {
      const teamService = new TeamService();
      const created = await teamService.createExternal({ nom: opponentNewName.trim() });
      raw = { ...raw, opponentTeamId: created.id, opponentName: null };
    }

    const data = updateFriendlyMatchSchema.parse(raw);
    if (data.category) requireCategory(access, data.category);

    await service.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "FriendlyMatch", entityId: String(id) });

    revalidatePath("/admin/friendly-matches");
    return { success: true, message: "Match amical modifié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function setFriendlyMatchResult(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "friendlyMatches.edit");

    const service = new FriendlyMatchService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Match amical non trouvé");
    requireCategory(access, existing.category);

    const data = setFriendlyMatchResultSchema.parse({
      status: formData.get("status") as string,
      scoreHome: formData.get("scoreHome") ? parseInt(formData.get("scoreHome") as string, 10) : null,
      scoreAway: formData.get("scoreAway") ? parseInt(formData.get("scoreAway") as string, 10) : null,
    });

    await service.setResult(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "FriendlyMatch", entityId: String(id), after: data });

    revalidatePath("/admin/friendly-matches");
    return { success: true, message: "Résultat enregistré avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

export async function deleteFriendlyMatch(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "friendlyMatches.delete");

    const service = new FriendlyMatchService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Match amical non trouvé");
    requireCategory(access, existing.category);

    await service.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "FriendlyMatch", entityId: String(id) });

    revalidatePath("/admin/friendly-matches");
    return { success: true, message: "Match amical supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
