"use server";

import { revalidatePath } from "next/cache";
import { AnnouncementService } from "@/services/AnnouncementService";
import { ClubApprovalService } from "@/services/ClubApprovalService";
import { getUserAccess, requirePermission } from "@/lib/access";
import { sanitizeRichTextHtml } from "@/lib/richTextSecurity";
import { announcementSchema } from "@/types/announcements";

const announcementService = new AnnouncementService();
const approvalService = new ClubApprovalService();

function revalidateAnnouncements() {
  revalidatePath("/admin/announcements");
  revalidatePath("/admin/approvals");
  revalidatePath("/communiques");
}

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
    await announcementService.create(access.teamId, data);

    revalidateAnnouncements();
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
    const before = await announcementService.findById(id, access.teamId);
    if (!before) throw new Error("Communiqué introuvable");

    const sensitiveChanged =
      before.title !== data.title ||
      before.contentHtml !== data.contentHtml ||
      before.category !== data.category;

    if (before.isPublished && sensitiveChanged) {
      const settings = await approvalService.getSettings(access.teamId);
      if (settings.announcementReapprovalOnSensitiveChange) {
        await announcementService.setPublished(id, access.teamId, false);
        await announcementService.update(id, access.teamId, data);
        const result = await approvalService.submitPublication(
          "ANNOUNCEMENT",
          String(id),
          access.teamId,
          access.userId,
        );
        revalidateAnnouncements();
        return { success: true, message: result.message };
      }
    }

    await announcementService.update(id, access.teamId, data);
    revalidateAnnouncements();
    return { success: true, message: "Communiqué modifié" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function togglePublish(id: number, isPublished: boolean) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "announcements.manage");

    if (!isPublished) {
      await announcementService.setPublished(id, access.teamId, false);
      revalidateAnnouncements();
      return { success: true, message: "Communiqué retiré de la publication" };
    }

    const result = await approvalService.submitPublication(
      "ANNOUNCEMENT",
      String(id),
      access.teamId,
      access.userId,
    );
    revalidateAnnouncements();
    return { success: true, message: result.message };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur" };
  }
}

export async function deleteAnnouncement(id: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "announcements.manage");
    await announcementService.delete(id, access.teamId);
    revalidateAnnouncements();
    return { success: true, message: "Communiqué supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
