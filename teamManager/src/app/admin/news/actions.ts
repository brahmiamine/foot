"use server";

import { NewsService } from "@/services/NewsService";
import { requireTeamId } from "@/lib/team-context";
import { createNewsSchema, updateNewsSchema } from "@/types/news";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { PlatformNotificationService } from "@/services/PlatformNotificationService";

/**
 * Server Actions for News CRUD operations
 */

/**
 * Create a new news article
 */
export async function createNews(formData: FormData) {
  try {
    const data = {
      title: formData.get("title") as string,
      contentHtml: formData.get("contentHtml") as string,
      coverImage: (formData.get("coverImage") as string) || null,
      authorId: formData.get("authorId") ? parseInt(formData.get("authorId") as string, 10) : null,
      status: (formData.get("status") as "DRAFT" | "PUBLISHED") || "DRAFT",
      isPublished: formData.get("isPublished") === "true",
      publishedAt: formData.get("publishedAt") ? new Date(formData.get("publishedAt") as string) : null,
    };

    const validatedData = createNewsSchema.parse(data);
    const teamId = await requireTeamId();
    const newsService = new NewsService();
    const news = await newsService.create(validatedData, teamId);

    // Associate media items if provided
    const mediaIdsStr = formData.get("mediaIds") as string | null;
    if (mediaIdsStr) {
      try {
        const mediaIds: number[] = JSON.parse(mediaIdsStr);
        for (let i = 0; i < mediaIds.length; i++) {
          await newsService.addMediaToNews(news.id, mediaIds[i], teamId, i);
        }
      } catch (parseError) {
        // If mediaIds parsing fails, continue without media association
        console.error("Error parsing mediaIds:", parseError);
      }
    }

    if (validatedData.isPublished) {
      try {
        const session = await auth();
        const notificationService = new PlatformNotificationService();
        await notificationService.notifyTeam(
          teamId,
          {
            type: "NEWS_PUBLISHED",
            title: "Nouvelle actualité publiée",
            body: validatedData.title,
            url: "/admin/news",
            createdBy: session?.user?.id ?? null,
          },
          { excludeUserId: session?.user?.id }
        );
      } catch (notifyError) {
        console.error("Error sending news notification:", notifyError);
      }
    }

    revalidatePath("/admin/news");
    return { success: true, message: "Actualité créée avec succès", id: news.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création",
    };
  }
}

/**
 * Update a news article
 */
export async function updateNews(id: number, formData: FormData) {
  try {
    const data = {
      title: formData.get("title") as string,
      contentHtml: formData.get("contentHtml") as string,
      coverImage: (formData.get("coverImage") as string) || null,
      authorId: formData.get("authorId") ? parseInt(formData.get("authorId") as string, 10) : null,
      status: (formData.get("status") as "DRAFT" | "PUBLISHED") || undefined,
      isPublished: formData.get("isPublished") === "true",
      publishedAt: formData.get("publishedAt") ? new Date(formData.get("publishedAt") as string) : null,
    };

    // Remove undefined values
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

    const validatedData = updateNewsSchema.parse(cleanData);
    const teamId = await requireTeamId();
    const newsService = new NewsService();
    await newsService.update(id, teamId, validatedData);

    revalidatePath("/admin/news");
    return { success: true, message: "Actualité modifiée avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la modification",
    };
  }
}

/**
 * Delete a news article
 */
export async function deleteNews(id: number) {
  try {
    const teamId = await requireTeamId();
    const newsService = new NewsService();
    await newsService.delete(id, teamId);

    revalidatePath("/admin/news");
    return { success: true, message: "Actualité supprimée avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}

/**
 * Add a media item to a news article
 */
export async function addMediaToNews(newsId: number, mediaItemId: number, displayOrder: number = 0) {
  try {
    const teamId = await requireTeamId();
    const newsService = new NewsService();
    await newsService.addMediaToNews(newsId, mediaItemId, teamId, displayOrder);

    revalidatePath("/admin/news");
    revalidatePath(`/admin/news/${newsId}/edit`);
    return { success: true, message: "Média ajouté à l'actualité avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'ajout du média",
    };
  }
}

/**
 * Remove a media item from a news article
 */
export async function removeMediaFromNews(newsId: number, mediaItemId: number) {
  try {
    const newsService = new NewsService();
    await newsService.removeMediaFromNews(newsId, mediaItemId);

    revalidatePath("/admin/news");
    revalidatePath(`/admin/news/${newsId}/edit`);
    return { success: true, message: "Média retiré de l'actualité avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression du média",
    };
  }
}

/**
 * Update display order of media items in a news article
 */
export async function updateNewsMediaOrder(newsId: number, items: Array<{ mediaItemId: number; displayOrder: number }>) {
  try {
    const newsService = new NewsService();
    await newsService.updateNewsMediaOrder(newsId, items);

    revalidatePath("/admin/news");
    revalidatePath(`/admin/news/${newsId}/edit`);
    return { success: true, message: "Ordre des médias mis à jour avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la mise à jour de l'ordre",
    };
  }
}
