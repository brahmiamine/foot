"use server";

import { revalidatePath } from "next/cache";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { SeasonService } from "@/services/SeasonService";
import { createSeasonSchema, updateSeasonSchema } from "@/types/seasons";

function readSeasonForm(formData: FormData) {
  return {
    name: formData.get("name") as string,
    startDate: (formData.get("startDate") as string) || null,
    endDate: (formData.get("endDate") as string) || null,
    status: (formData.get("status") as string) || "PLANNED",
    isCurrent: formData.get("isCurrent") === "on",
  };
}

export async function createSeason(formData: FormData) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "structure.manage");

    const data = createSeasonSchema.parse(readSeasonForm(formData));
    const teamId = await requireTeamId();
    const service = new SeasonService();
    await service.create(data, teamId);

    revalidatePath("/admin/seasons");
    return { success: true, message: "Saison créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateSeason(id: number, formData: FormData) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "structure.manage");

    const data = updateSeasonSchema.parse(readSeasonForm(formData));
    const teamId = await requireTeamId();
    const service = new SeasonService();
    await service.update(id, teamId, data);

    revalidatePath("/admin/seasons");
    return { success: true, message: "Saison modifiée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteSeason(id: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "structure.manage");

    const teamId = await requireTeamId();
    const service = new SeasonService();
    await service.delete(id, teamId);

    revalidatePath("/admin/seasons");
    return { success: true, message: "Saison supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
