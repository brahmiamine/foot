"use server";

import { revalidatePath } from "next/cache";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { GuardianService } from "@/services/GuardianService";
import { createGuardianSchema, updateGuardianSchema, linkGuardianPlayerSchema } from "@/types/guardians";

export async function createGuardian(formData: FormData) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "guardians.manage");

    const data = createGuardianSchema.parse({
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
    });

    const teamId = await requireTeamId();
    const service = new GuardianService();
    await service.create({ ...data, email: data.email || null }, teamId);

    revalidatePath("/admin/guardians");
    return { success: true, message: "Parent/tuteur créé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateGuardian(id: number, formData: FormData) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "guardians.manage");

    const data = updateGuardianSchema.parse({
      firstName: (formData.get("firstName") as string) || undefined,
      lastName: (formData.get("lastName") as string) || undefined,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
    });

    const teamId = await requireTeamId();
    const service = new GuardianService();
    await service.update(id, teamId, { ...data, email: data.email || null });

    revalidatePath("/admin/guardians");
    return { success: true, message: "Parent/tuteur modifié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteGuardian(id: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "guardians.manage");

    const teamId = await requireTeamId();
    const service = new GuardianService();
    await service.delete(id, teamId);

    revalidatePath("/admin/guardians");
    return { success: true, message: "Parent/tuteur supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function linkGuardianToPlayer(formData: FormData) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "guardians.manage");

    const data = linkGuardianPlayerSchema.parse({
      guardianId: formData.get("guardianId") as string,
      playerId: formData.get("playerId") as string,
      relationship: (formData.get("relationship") as string) || null,
      isPrimary: formData.get("isPrimary") === "on",
      hasCustody: formData.get("hasCustody") !== "off",
      receivesNotifications: formData.get("receivesNotifications") !== "off",
      receivesDocuments: formData.get("receivesDocuments") !== "off",
    });

    const service = new GuardianService();
    await service.linkPlayer(data.guardianId, data);

    revalidatePath("/admin/guardians");
    return { success: true, message: "Joueur lié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la liaison" };
  }
}

export async function unlinkGuardianFromPlayer(linkId: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "guardians.manage");

    const service = new GuardianService();
    await service.unlinkPlayer(linkId);

    revalidatePath("/admin/guardians");
    return { success: true, message: "Liaison retirée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du retrait" };
  }
}
