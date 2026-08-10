"use server";

import { revalidatePath } from "next/cache";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission, requireCategory } from "@/lib/access";
import { LicenseService } from "@/services/LicenseService";
import { PlayerService } from "@/services/PlayerService";
import { createLicenseSchema, updateLicenseSchema } from "@/types/licenses";

function readForm(formData: FormData) {
  return {
    seasonId: formData.get("seasonId") ? parseInt(formData.get("seasonId") as string, 10) : null,
    licenseNumber: (formData.get("licenseNumber") as string) || null,
    licenseType: (formData.get("licenseType") as string) || "PLAYER",
    status: (formData.get("status") as string) || "PENDING",
    issuedAt: (formData.get("issuedAt") as string) || null,
    expiresAt: (formData.get("expiresAt") as string) || null,
    documentUrl: (formData.get("documentUrl") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };
}

export async function createLicense(formData: FormData) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "licenses.manage");

    const holderType = (formData.get("holderType") as string) || "PLAYER";
    const playerId = (formData.get("playerId") as string) || null;
    const staffId = formData.get("staffId") ? parseInt(formData.get("staffId") as string, 10) : null;

    const data = createLicenseSchema.parse({ ...readForm(formData), holderType, playerId, staffId });

    const teamId = await requireTeamId();
    if (data.holderType === "PLAYER" && data.playerId) {
      const playerService = new PlayerService();
      const player = await playerService.findById(data.playerId, teamId);
      if (!player) throw new Error("Joueur non trouvé");
      requireCategory(access, player.category);
    }

    const service = new LicenseService();
    await service.create(data, teamId);

    revalidatePath("/admin/licenses");
    return { success: true, message: "Licence créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateLicense(id: number, formData: FormData) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "licenses.manage");

    const data = updateLicenseSchema.parse(readForm(formData));
    const teamId = await requireTeamId();
    const service = new LicenseService();
    await service.update(id, teamId, data);

    revalidatePath("/admin/licenses");
    return { success: true, message: "Licence modifiée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteLicense(id: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "licenses.manage");

    const teamId = await requireTeamId();
    const service = new LicenseService();
    await service.delete(id, teamId);

    revalidatePath("/admin/licenses");
    return { success: true, message: "Licence supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
