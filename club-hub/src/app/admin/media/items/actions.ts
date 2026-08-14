"use server";

import { MediaItemService } from "@/services/MediaItemService";
import { requireTeamId } from "@/lib/team-context";
import { createMediaItemSchema, updateMediaItemSchema } from "@/types/media";
import { revalidatePath } from "next/cache";

/**
 * Server Actions for MediaItems CRUD operations
 */

/**
 * Create a new media item
 */
export async function createMediaItem(formData: FormData) {
  try {
    const data = {
      url: formData.get("url") as string,
      type: formData.get("type") as "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO",
      mimeType: (formData.get("mimeType") as string) || null,
      altTextFr: (formData.get("altTextFr") as string) || null,
      altTextAr: (formData.get("altTextAr") as string) || null,
      uploaderId: formData.get("uploaderId") ? parseInt(formData.get("uploaderId") as string, 10) : null,
    };

    const validatedData = createMediaItemSchema.parse(data);
    const teamId = await requireTeamId();
    const mediaItemService = new MediaItemService();
    await mediaItemService.create(validatedData, teamId);

    revalidatePath("/admin/media/items");
    return { success: true, message: "Élément média créé avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création",
    };
  }
}

/**
 * Update a media item
 */
export async function updateMediaItem(id: number, formData: FormData) {
  try {
    const data = {
      url: formData.get("url") as string,
      type: formData.get("type") as "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | undefined,
      mimeType: (formData.get("mimeType") as string) || null,
      altTextFr: (formData.get("altTextFr") as string) || null,
      altTextAr: (formData.get("altTextAr") as string) || null,
    };

    const validatedData = updateMediaItemSchema.parse(data);
    const teamId = await requireTeamId();
    const mediaItemService = new MediaItemService();
    await mediaItemService.update(id, teamId, validatedData);

    revalidatePath("/admin/media/items");
    return { success: true, message: "Élément média modifié avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la modification",
    };
  }
}

/**
 * Delete a media item
 */
export async function deleteMediaItem(id: number) {
  try {
    const teamId = await requireTeamId();
    const mediaItemService = new MediaItemService();
    await mediaItemService.delete(id, teamId);

    revalidatePath("/admin/media/items");
    return { success: true, message: "Élément média supprimé avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}

