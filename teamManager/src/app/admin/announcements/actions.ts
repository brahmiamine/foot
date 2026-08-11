"use server";

import { revalidatePath } from "next/cache";
import { AnnouncementService } from "@/services/AnnouncementService";
import { requireTeamId } from "@/lib/team-context";
import { announcementSchema } from "@/types/announcements";

export async function createAnnouncement(formData: FormData) {
  try {
    const data = announcementSchema.parse({
      title: formData.get("title") as string,
      contentHtml: formData.get("contentHtml") as string,
      category: formData.get("category") as string,
    });

    const teamId = await requireTeamId();
    await new AnnouncementService().create(teamId, data);

    revalidatePath("/admin/announcements");
    return { success: true, message: "Communiqué créé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateAnnouncement(id: number, formData: FormData) {
  try {
    const data = announcementSchema.parse({
      title: formData.get("title") as string,
      contentHtml: formData.get("contentHtml") as string,
      category: formData.get("category") as string,
    });

    const teamId = await requireTeamId();
    await new AnnouncementService().update(id, teamId, data);

    revalidatePath("/admin/announcements");
    return { success: true, message: "Communiqué modifié" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function togglePublish(id: number, isPublished: boolean) {
  try {
    const teamId = await requireTeamId();
    await new AnnouncementService().setPublished(id, teamId, isPublished);
    revalidatePath("/admin/announcements");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur" };
  }
}

export async function deleteAnnouncement(id: number) {
  try {
    const teamId = await requireTeamId();
    await new AnnouncementService().delete(id, teamId);
    revalidatePath("/admin/announcements");
    return { success: true, message: "Communiqué supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
