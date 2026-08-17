"use server";

import { NewsService } from "@/services/NewsService";
import { ClubApprovalService } from "@/services/ClubApprovalService";
import { getUserAccess, requirePermission } from "@/lib/access";
import { sanitizeRichTextHtml } from "@/lib/richTextSecurity";
import { createNewsSchema, updateNewsSchema } from "@/types/news";
import { revalidatePath } from "next/cache";

const newsService = new NewsService();
const approvalService = new ClubApprovalService();

function revalidateNews(newsId?: number) {
  revalidatePath("/admin/news");
  revalidatePath("/admin/approvals");
  revalidatePath("/");
  if (newsId != null) revalidatePath(`/admin/news/${newsId}/edit`);
}

function sensitiveNewsChanged(
  before: { title: string; contentHtml: string; coverImage?: string | null },
  next: { title?: string; contentHtml?: string; coverImage?: string | null },
): boolean {
  return (
    (next.title !== undefined && next.title !== before.title) ||
    (next.contentHtml !== undefined && next.contentHtml !== before.contentHtml) ||
    (next.coverImage !== undefined && next.coverImage !== before.coverImage)
  );
}

function hasProtectedEditorialReview(before: { editorialStatus: string }): boolean {
  return ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "SCHEDULED"].includes(before.editorialStatus);
}

function sensitiveEditNeedsApprovalRefresh(before: {
  status: "DRAFT" | "PUBLISHED";
  editorialStatus: string;
  isPublished: boolean;
}): boolean {
  return (before.status === "PUBLISHED" && before.isPublished) || hasProtectedEditorialReview(before);
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

    const publicationRequested = validatedData.status === "PUBLISHED" || validatedData.isPublished;
    if (publicationRequested) requirePermission(access, "news.publish");

    const teamId = access.teamId;
    const news = await newsService.create(
      {
        ...validatedData,
        status: "DRAFT",
        isPublished: false,
        publishedAt: null,
      },
      teamId,
    );

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

    let message = "Actualité créée avec succès";
    if (publicationRequested) {
      const result = await approvalService.submitPublication("NEWS", String(news.id), teamId, access.userId);
      message = result.message;
    }

    revalidateNews(news.id);
    return { success: true, message, id: news.id };
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

    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, value]) => value !== undefined));
    const parsed = updateNewsSchema.parse(cleanData);
    const validatedData = {
      ...parsed,
      ...(parsed.contentHtml !== undefined ? { contentHtml: sanitizeRichTextHtml(parsed.contentHtml) } : {}),
    };

    const access = await getUserAccess();
    requirePermission(access, "news.edit");
    const teamId = access.teamId;
    const before = await newsService.findById(id, teamId);
    if (!before) throw new Error("Actualité non trouvée");

    const publicationRequested = validatedData.status === "PUBLISHED" || validatedData.isPublished === true;
    const wasPublished = before.status === "PUBLISHED" && before.isPublished;
    const explicitUnpublish =
      wasPublished && (validatedData.status === "DRAFT" || validatedData.isPublished === false);
    const sensitiveChanged = sensitiveNewsChanged(before, validatedData);
    const protectedEditorialEdit = sensitiveChanged && hasProtectedEditorialReview(before);

    if (publicationRequested || explicitUnpublish || protectedEditorialEdit) {
      requirePermission(access, "news.publish");
    }

    // A scheduled/pending-review News is represented by legacy status=DRAFT.
    // Editing its protected content must not be mistaken for an ordinary
    // unpublish: keep the requested schedule and refresh the approval flow.
    if (protectedEditorialEdit && !publicationRequested) {
      await newsService.update(id, teamId, {
        ...validatedData,
        status: "DRAFT",
        isPublished: false,
        publishedAt: null,
      });
      const result = await approvalService.requireReapprovalAfterSensitiveEdit(
        "NEWS",
        String(id),
        teamId,
        access.userId,
      );
      revalidateNews(id);
      return {
        success: true,
        message: result?.message ?? "Actualité modifiée selon la politique de revalidation",
      };
    }

    if (publicationRequested && (!wasPublished || sensitiveChanged)) {
      await newsService.update(id, teamId, {
        ...validatedData,
        status: "DRAFT",
        isPublished: false,
        publishedAt: null,
        scheduledAt: null,
      });
      const result = await approvalService.submitPublication("NEWS", String(id), teamId, access.userId);
      revalidateNews(id);
      return { success: true, message: result.message };
    }

    if (explicitUnpublish && !publicationRequested) {
      await newsService.update(id, teamId, {
        ...validatedData,
        status: "DRAFT",
        editorialStatus: "DRAFT",
        isPublished: false,
        publishedAt: null,
        scheduledAt: null,
      });
      revalidateNews(id);
      return { success: true, message: "Actualité repassée en brouillon" };
    }

    await newsService.update(id, teamId, {
      ...validatedData,
      ...(wasPublished ? { status: "PUBLISHED", isPublished: true, publishedAt: before.publishedAt } : {}),
    });

    revalidateNews(id);
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

    revalidateNews(id);
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
    const before = await newsService.findById(newsId, access.teamId);
    if (!before) throw new Error("Actualité non trouvée");

    await newsService.addMediaToNews(newsId, mediaItemId, access.teamId, displayOrder);
    if (sensitiveEditNeedsApprovalRefresh(before)) {
      await approvalService.requireReapprovalAfterSensitiveEdit(
        "NEWS",
        String(newsId),
        access.teamId,
        access.userId,
      );
    }

    revalidateNews(newsId);
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
    const before = await newsService.findById(newsId, access.teamId);
    if (!before) throw new Error("Actualité non trouvée");

    await newsService.removeMediaFromNews(newsId, mediaItemId, access.teamId);
    if (sensitiveEditNeedsApprovalRefresh(before)) {
      await approvalService.requireReapprovalAfterSensitiveEdit(
        "NEWS",
        String(newsId),
        access.teamId,
        access.userId,
      );
    }

    revalidateNews(newsId);
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
  items: Array<{ mediaItemId: number; displayOrder: number }>,
) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "news.edit");
    const before = await newsService.findById(newsId, access.teamId);
    if (!before) throw new Error("Actualité non trouvée");

    await newsService.updateNewsMediaOrder(newsId, items, access.teamId);
    if (sensitiveEditNeedsApprovalRefresh(before)) {
      await approvalService.requireReapprovalAfterSensitiveEdit(
        "NEWS",
        String(newsId),
        access.teamId,
        access.userId,
      );
    }

    revalidateNews(newsId);
    return { success: true, message: "Ordre des médias mis à jour avec succès" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la mise à jour de l'ordre",
    };
  }
}
