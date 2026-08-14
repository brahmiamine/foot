"use server";

import { NewsService } from "@/services/NewsService";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { requireTeamId } from "@/lib/team-context";
import { createNewsSchema, updateNewsSchema } from "@/types/news";
import { revalidatePath } from "next/cache";
import { getDataSource } from "@/lib/database";
import type { NotifyPayload } from "@/lib/notificationClient";
import type { News } from "@/entities/News";
import type { EntityManager } from "typeorm";

const newsService = new NewsService();
const notificationOutbox = new NotificationOutboxService();

/**
 * TS-25 (avancement.md, Epic E07) : la publication (au sens large — voir
 * appelants) et la mise en file de la notification s'engagent dans la
 * MÊME transaction, remplaçant l'ancien `notify(...)` best-effort appelé
 * après coup (perdu si le process crashait entre le commit News et
 * l'appel réseau, ou si notifications était injoignable au même
 * instant). `NotificationOutboxService.processDue()` livre effectivement
 * l'événement (voir /api/internal/outbox/process, TS-26).
 */
function newsPublishedPayload(newsId: number, title: string, teamId: string): NotifyPayload {
  return {
    eventId: `news-published:${newsId}`,
    type: "NEWS_PUBLISHED",
    target: { type: "MEMBERS", teamId },
    teamId,
    category: "NEWS_PUBLISHED",
    title: "Nouvelle actualité",
    body: title,
    data: { newsId, newsTitle: title },
  };
}

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

    let news: News;
    if (validatedData.status === "PUBLISHED") {
      const dataSource = await getDataSource();
      news = await dataSource.transaction(async (manager: EntityManager) => {
        const created = await newsService.create(validatedData, teamId, manager);
        await notificationOutbox.enqueue(
          manager,
          newsPublishedPayload(created.id, validatedData.title, teamId)
        );
        return created;
      });
    } else {
      news = await newsService.create(validatedData, teamId);
    }

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
    const before = await newsService.findById(id, teamId);
    const justPublished = before?.status !== "PUBLISHED" && validatedData.status === "PUBLISHED";

    if (justPublished) {
      const dataSource = await getDataSource();
      await dataSource.transaction(async (manager: EntityManager) => {
        const saved = await newsService.update(id, teamId, validatedData, manager);
        await notificationOutbox.enqueue(manager, newsPublishedPayload(id, saved.title, teamId));
      });
    } else {
      await newsService.update(id, teamId, validatedData);
    }

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
    const teamId = await requireTeamId();
    const newsService = new NewsService();
    await newsService.removeMediaFromNews(newsId, mediaItemId, teamId);

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
    const teamId = await requireTeamId();
    const newsService = new NewsService();
    await newsService.updateNewsMediaOrder(newsId, items, teamId);

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
