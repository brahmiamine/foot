"use server";

import { revalidatePath } from "next/cache";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission, requireCategory } from "@/lib/access";
import { InternalTeamService } from "@/services/InternalTeamService";
import { createInternalTeamSchema, updateInternalTeamSchema } from "@/types/internal-teams";

function readForm(formData: FormData) {
  return {
    seasonId: formData.get("seasonId") ? parseInt(formData.get("seasonId") as string, 10) : null,
    name: formData.get("name") as string,
    category: (formData.get("category") as string) || "seniors",
    gender: (formData.get("gender") as string) || "male",
    code: (formData.get("code") as string) || null,
  };
}

export async function createInternalTeam(formData: FormData) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "structure.manage");

    const data = createInternalTeamSchema.parse(readForm(formData));
    requireCategory(access, data.category);

    const teamId = await requireTeamId();
    const service = new InternalTeamService();
    await service.create(data, teamId);

    revalidatePath("/admin/squads");
    return { success: true, message: "Équipe interne créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateInternalTeam(id: number, formData: FormData) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "structure.manage");

    const teamId = await requireTeamId();
    const service = new InternalTeamService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Équipe interne non trouvée");
    requireCategory(access, existing.category);

    const raw = readForm(formData);
    const status = (formData.get("status") as string) || undefined;
    const data = updateInternalTeamSchema.parse({ ...raw, status });
    if (data.category) requireCategory(access, data.category);

    await service.update(id, teamId, data);

    revalidatePath("/admin/squads");
    return { success: true, message: "Équipe interne modifiée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteInternalTeam(id: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "structure.manage");

    const teamId = await requireTeamId();
    const service = new InternalTeamService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Équipe interne non trouvée");
    requireCategory(access, existing.category);

    await service.delete(id, teamId);

    revalidatePath("/admin/squads");
    return { success: true, message: "Équipe interne supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
