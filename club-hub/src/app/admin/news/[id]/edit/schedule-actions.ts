"use server";

import { revalidatePath } from "next/cache";
import { getUserAccess, requirePermission } from "@/lib/access";
import { NewsService } from "@/services/NewsService";
import { ClubApprovalService } from "@/services/ClubApprovalService";

function revalidateNews(id: number) {
  revalidatePath("/admin/news");
  revalidatePath(`/admin/news/${id}/edit`);
  revalidatePath("/admin/approvals");
  revalidatePath("/");
}

export async function scheduleNewsPublication(id: number, formData: FormData): Promise<void> {
  const access = await getUserAccess();
  requirePermission(access, "news.edit");
  requirePermission(access, "news.publish");

  const raw = String(formData.get("scheduledAt") ?? "");
  const scheduledAt = new Date(raw);
  if (!raw || Number.isNaN(scheduledAt.getTime())) throw new Error("Date de publication invalide");
  if (scheduledAt.getTime() <= Date.now()) throw new Error("La publication planifiée doit être dans le futur");

  const newsService = new NewsService();
  const news = await newsService.findById(id, access.teamId);
  if (!news) throw new Error("Actualité non trouvée");

  await newsService.update(id, access.teamId, {
    scheduledAt,
    status: "DRAFT",
    editorialStatus: "DRAFT",
    isPublished: false,
    publishedAt: null,
  });
  await new ClubApprovalService().submitPublication("NEWS", String(id), access.teamId, access.userId);
  revalidateNews(id);
}

export async function cancelNewsSchedule(id: number): Promise<void> {
  const access = await getUserAccess();
  requirePermission(access, "news.edit");
  requirePermission(access, "news.publish");

  const service = new NewsService();
  const news = await service.findById(id, access.teamId);
  if (!news) throw new Error("Actualité non trouvée");
  if (news.editorialStatus === "PUBLISHED") throw new Error("Une actualité déjà publiée doit être dépubliée via le workflow habituel");

  await service.update(id, access.teamId, {
    scheduledAt: null,
    editorialStatus: "DRAFT",
    status: "DRAFT",
    isPublished: false,
    publishedAt: null,
  });
  revalidateNews(id);
}
