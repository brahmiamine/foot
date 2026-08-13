"use server";

import { MediaGalleryService } from "@/services/MediaGalleryService";
import { requireTeamId } from "@/lib/team-context";
import { createMediaGallerySchema, updateMediaGallerySchema } from "@/types/media";
import { revalidatePath } from "next/cache";

/**
 * Server Actions for MediaGalleries CRUD operations
 */

/**
 * Create a new media gallery
 */
export async function createMediaGallery(formData: FormData) {
  try {
    const data = {
      titleFr: formData.get("titleFr") as string,
      titleAr: (formData.get("titleAr") as string) || null,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      coverImageId: formData.get("coverImageId") ? parseInt(formData.get("coverImageId") as string, 10) : null,
      isPublic: formData.get("isPublic") === "true" || formData.get("isPublic") === "1",
    };

    const validatedData = createMediaGallerySchema.parse(data);
    const teamId = await requireTeamId();
    const galleryService = new MediaGalleryService();
    await galleryService.create(validatedData, teamId);

    revalidatePath("/admin/media/galleries");
    return { success: true, message: "Galerie créée avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création",
    };
  }
}

/**
 * Update a media gallery
 */
export async function updateMediaGallery(id: number, formData: FormData) {
  try {
    const data = {
      titleFr: formData.get("titleFr") as string,
      titleAr: (formData.get("titleAr") as string) || null,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      coverImageId: formData.get("coverImageId") ? parseInt(formData.get("coverImageId") as string, 10) : null,
      isPublic: formData.get("isPublic") === "true" || formData.get("isPublic") === "1",
    };

    const validatedData = updateMediaGallerySchema.parse(data);
    const teamId = await requireTeamId();
    const galleryService = new MediaGalleryService();
    await galleryService.update(id, teamId, validatedData);

    revalidatePath("/admin/media/galleries");
    return { success: true, message: "Galerie modifiée avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la modification",
    };
  }
}

/**
 * Delete a media gallery
 */
export async function deleteMediaGallery(id: number) {
  try {
    const teamId = await requireTeamId();
    const galleryService = new MediaGalleryService();
    await galleryService.delete(id, teamId);

    revalidatePath("/admin/media/galleries");
    return { success: true, message: "Galerie supprimée avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}

/**
 * Add a media item to a gallery
 */
export async function addItemToGallery(galleryId: number, mediaItemId: number, displayOrder: number = 0) {
  try {
    const teamId = await requireTeamId();
    const galleryService = new MediaGalleryService();
    await galleryService.addItemToGallery(galleryId, mediaItemId, teamId, displayOrder);

    revalidatePath("/admin/media/galleries");
    return { success: true, message: "Élément ajouté à la galerie avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'ajout de l'élément",
    };
  }
}

/**
 * Remove a media item from a gallery
 */
export async function removeItemFromGallery(galleryId: number, mediaItemId: number) {
  try {
    const teamId = await requireTeamId();
    const galleryService = new MediaGalleryService();
    await galleryService.removeItemFromGallery(galleryId, mediaItemId, teamId);

    revalidatePath("/admin/media/galleries");
    return { success: true, message: "Élément retiré de la galerie avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression de l'élément",
    };
  }
}

/**
 * Update display order of items in a gallery
 */
export async function updateGalleryItemOrder(galleryId: number, items: Array<{ mediaItemId: number; displayOrder: number }>) {
  try {
    const teamId = await requireTeamId();
    const galleryService = new MediaGalleryService();
    await galleryService.updateItemOrder(galleryId, items, teamId);

    revalidatePath("/admin/media/galleries");
    return { success: true, message: "Ordre des éléments mis à jour avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la mise à jour de l'ordre",
    };
  }
}

