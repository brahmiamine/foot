"use server";

import { revalidatePath } from "next/cache";
import { AnnouncementService } from "@/services/AnnouncementService";
import { getUserAccess, requirePermission } from "@/lib/access";
import { sanitizeRichTextHtml } from "@/lib/richTextSecurity";
import { announcementSchema } from "@/types/announcements";

export async function createAnnouncement(formData: FormData) {
  try {
    const parsed = announcementSchema.parse({
      title: formData.get("title") as string,
      contentHtml: formData.get("contentHtml") as string,
      category: formData.get("category") as string,
    });
    const data = { ...parsed, contentHtml: sanitizeRichTextHtml(parsed.contentHtml) };

    const access = await getUserAccess();
    requirePermission(access, "announcements.manage");
    await new AnnouncementService().create(access.teamId, data);

    revalidatePath("/admin/announcements");
    return { success: true, message: "Communiqué créé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateAnnouncement(id: number, formData: FormData) {
  try {
    const parsed = announcementSchema.parse({
      title: formData.get("title") as string,
      contentHtml: formData.get("contentHtml") as string,
      category: formData.get("category") as string,
    });
    const data = { ...parsed, contentHtml: sanitizeRichTextHtml(parsed.contentHtml) };

    const access = await getUserAccess();
    requirePermission(access, "announcements.manage");
    await new AnnouncementService().update(id, access.teamId, data);

    revalidatePath("/admin/announcements");
    return { success: true, message: "Communiqué modifié" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function togglePublish(id: number, isPublished: boolean) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "announcements.manage");
    await new AnnouncementService().setPublished(id, access.teamId, isPublished);
    revalidatePath("/admin/announcements");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur" };
  }
}

export async function deleteAnnouncement(id: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "announcements.manage");
    await new AnnouncementService().delete(id, access.teamId);
    revalidatePath("/admin/announcements");
    return { success: true, message: "Communiqué supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
