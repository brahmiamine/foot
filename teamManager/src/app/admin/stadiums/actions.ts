"use server";

import { revalidatePath } from "next/cache";
import { StadiumService } from "@/services/StadiumService";
import { requireTeamId } from "@/lib/team-context";
import { createStadiumSchema, updateStadiumSchema } from "@/types/stadiums";

/**
 * Server Action: Create a new stadium
 */
export async function createStadium(formData: FormData) {
  try {
    const capacityValue = formData.get("capacity");
    const isHomeValue = formData.get("isHome");

    const data = {
      nameFr: formData.get("nameFr") as string,
      nameAr: (formData.get("nameAr") as string) || null,
      addressFr: (formData.get("addressFr") as string) || null,
      addressAr: (formData.get("addressAr") as string) || null,
      cityFr: (formData.get("cityFr") as string) || null,
      cityAr: (formData.get("cityAr") as string) || null,
      isHome: isHomeValue === "true" || isHomeValue === "on",
      capacity: capacityValue ? parseInt(capacityValue as string, 10) : null,
      imageUrl: (formData.get("imageUrl") as string) || null,
    };

    const validatedData = createStadiumSchema.parse(data);
    const teamId = await requireTeamId();
    const stadiumService = new StadiumService();
    await stadiumService.create(validatedData, teamId);

    revalidatePath("/admin/stadiums");
    return { success: true, message: "Stade créé avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création",
    };
  }
}

/**
 * Server Action: Update a stadium
 */
export async function updateStadium(id: number, formData: FormData) {
  try {
    const capacityValue = formData.get("capacity");
    const isHomeValue = formData.get("isHome");

    const data: {
      nameFr?: string;
      nameAr?: string | null;
      addressFr?: string | null;
      addressAr?: string | null;
      cityFr?: string | null;
      cityAr?: string | null;
      isHome?: boolean;
      capacity?: number | null;
      imageUrl?: string | null;
    } = {
      nameFr: formData.get("nameFr") as string,
      nameAr: (formData.get("nameAr") as string) || null,
      addressFr: (formData.get("addressFr") as string) || null,
      addressAr: (formData.get("addressAr") as string) || null,
      cityFr: (formData.get("cityFr") as string) || null,
      cityAr: (formData.get("cityAr") as string) || null,
      imageUrl: (formData.get("imageUrl") as string) || null,
    };

    if (capacityValue !== null) {
      data.capacity = capacityValue ? parseInt(capacityValue as string, 10) : null;
    }
    if (isHomeValue !== null) {
      data.isHome = isHomeValue === "true" || isHomeValue === "on";
    }

    const validatedData = updateStadiumSchema.parse(data);
    const teamId = await requireTeamId();
    const stadiumService = new StadiumService();
    await stadiumService.update(id, teamId, validatedData);

    revalidatePath("/admin/stadiums");
    return { success: true, message: "Stade modifié avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la modification",
    };
  }
}

/**
 * Server Action: Delete a stadium
 */
export async function deleteStadium(id: number) {
  try {
    const teamId = await requireTeamId();
    const stadiumService = new StadiumService();
    await stadiumService.delete(id, teamId);

    revalidatePath("/admin/stadiums");
    return { success: true, message: "Stade supprimé avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}

