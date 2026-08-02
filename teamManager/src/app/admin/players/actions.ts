"use server";

import { PlayerService } from "@/services/PlayerService";
import { requireTeamId } from "@/lib/team-context";
import { createPlayerSchema, updatePlayerSchema } from "@/types/players";
import { revalidatePath } from "next/cache";

/**
 * Server Actions for Player CRUD operations
 */

/**
 * Create a new player
 */
export async function createPlayer(formData: FormData) {
  try {
    const birthDateStr = formData.get("birthDate") as string;

    const data = {
      firstNameFr: formData.get("firstNameFr") as string,
      lastNameFr: formData.get("lastNameFr") as string,
      firstNameAr: (formData.get("firstNameAr") as string) || null,
      lastNameAr: (formData.get("lastNameAr") as string) || null,
      number: formData.get("number") ? parseInt(formData.get("number") as string, 10) : 0,
      status: (formData.get("status") as string) || undefined,
      birthDate: birthDateStr ? new Date(birthDateStr) : null,
      position: (formData.get("position") as string) || null,
      imageUrl: (formData.get("imageUrl") as string) || null,
    };

    const validatedData = createPlayerSchema.parse(data);
    const teamId = await requireTeamId();
    const playerService = new PlayerService();
    await playerService.create(validatedData, teamId);

    revalidatePath("/admin/players");
    return { success: true, message: "Joueur créé avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création",
    };
  }
}

/**
 * Update a player
 */
export async function updatePlayer(id: string, formData: FormData) {
  try {
    const birthDateStr = formData.get("birthDate") as string;
    const data: {
      firstNameFr?: string;
      lastNameFr?: string;
      firstNameAr?: string | null;
      lastNameAr?: string | null;
      number?: number;
      status?: "TITULAR" | "SUBSTITUTE" | "BLANK" | "ENTERING" | "OUT_OF_LIST" | "SUSPENDED";
      birthDate?: Date | null;
      position?: string | null;
      imageUrl?: string | null;
    } = {};

    if (formData.get("firstNameFr")) {
      data.firstNameFr = formData.get("firstNameFr") as string;
    }
    if (formData.get("lastNameFr")) {
      data.lastNameFr = formData.get("lastNameFr") as string;
    }
    if (formData.has("firstNameAr")) {
      data.firstNameAr = (formData.get("firstNameAr") as string) || null;
    }
    if (formData.has("lastNameAr")) {
      data.lastNameAr = (formData.get("lastNameAr") as string) || null;
    }
    if (formData.has("number")) {
      data.number = formData.get("number") ? parseInt(formData.get("number") as string, 10) : 0;
    }
    if (formData.has("status")) {
      data.status = formData.get("status") as
        | "TITULAR"
        | "SUBSTITUTE"
        | "BLANK"
        | "ENTERING"
        | "OUT_OF_LIST"
        | "SUSPENDED";
    }
    if (birthDateStr) {
      data.birthDate = new Date(birthDateStr);
    }
    if (formData.has("position")) {
      data.position = (formData.get("position") as string) || null;
    }
    if (formData.has("imageUrl")) {
      data.imageUrl = (formData.get("imageUrl") as string) || null;
    }

    const validatedData = updatePlayerSchema.parse(data);
    const teamId = await requireTeamId();
    const playerService = new PlayerService();
    await playerService.update(id, teamId, validatedData);

    revalidatePath("/admin/players");
    return { success: true, message: "Joueur modifié avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la modification",
    };
  }
}

/**
 * Delete a player
 */
export async function deletePlayer(id: string) {
  try {
    const teamId = await requireTeamId();
    const playerService = new PlayerService();
    await playerService.delete(id, teamId);

    revalidatePath("/admin/players");
    return { success: true, message: "Joueur supprimé avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}
