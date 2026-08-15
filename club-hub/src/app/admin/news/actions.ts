"use server";

import { NewsService } from "@/services/NewsService";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { getUserAccess, requirePermission } from "@/lib/access";
import { sanitizeRichTextHtml } from "@/lib/richTextSecurity";
import { createNewsSchema, updateNewsSchema } from "@/types/news";
import { revalidatePath } from "next/cache";
import { getDataSource } from "@/lib/database";
import type { NotifyPayload } from "@/lib/notificationClient";
import type { News } from "@/entities/News";
import type { EntityManager } from "typeorm";

const newsService = new NewsService();
const notificationOutbox = new NotificationOutboxService();

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

    const parsed = createNewsSchema.parse(data);
    const validatedData = { ...parsed, contentHtml: sanitizeRichTextHtml(parsed.contentHtml) };
    const access = await getUserAccess();
    requirePermission(access, "news.create");
    if (validatedData.status === "PUBLISHED" || validatedData.isPublished) {
      requirePermission(access, "news.publish");
    }
    const teamId = access.teamId;

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

    const mediaIdsStr = formData.get("mediaIds") as string | null;
    if (mediaIdsStr) {
      try {
        const mediaIds: number[] = JSON.parse(mediaIdsStr);
        for (let i = 0; i < mediaIds.length; i++) {
          await newsService.addMediaToNews(news.id, mediaIds[i], teamId, i);
        }
      } catch (parseError) {
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

    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    const parsed = updateNewsSchema.parse(cleanData);
    const validatedData = {
      ...parsed,
      ...(parsed.contentHtml !== undefined
        ? { contentHtml: sanitizeRichTextHtml(parsed.contentHtml) }
        : {}),
    };

    const access = await getUserAccess();
    requirePermission(access, "news.edit");
    const teamId = access.teamId;
    const before = await newsService.findById(id, teamId);
    if (!before) throw new Error("Actualité non trouvée");

    const publicationChanged =
      (validatedData.status !== undefined && validatedData.status !== before.status) ||
      (validatedData.isPublished !== undefined && validatedData.isPublished !== before.isPublished);
    if (publicationChanged) requirePermission(access, "news.publish");

    const justPublished = before.status !== "PUBLISHED" && validatedData.status === "PUBLISHED";
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

export async function deleteNews(id: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "news.delete");
    await newsService.delete(id, access.teamId);

    revalidatePath("/admin/news");
    return { success: true, message: "Actualité supprimée avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression",
    };
  }
}

export async function addMediaToNews(newsId: number, mediaItemId: number, displayOrder: number = 0) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "news.edit");
    await newsService.addMediaToNews(newsId, mediaItemId, access.teamId, displayOrder);

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

export async function removeMediaFromNews(newsId: number, mediaItemId: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "news.edit");
    await newsService.removeMediaFromNews(newsId, mediaItemId, access.teamId);

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

export async function updateNewsMediaOrder(
  newsId: number,
  items: Array<{ mediaItemId: number; displayOrder: number }>
) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "news.edit");
    await newsService.updateNewsMediaOrder(newsId, items, access.teamId);

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
