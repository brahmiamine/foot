import { NewsService } from "@/services/NewsService";
import { MediaItemService } from "@/services/MediaItemService";
import { requireTeamId } from "@/lib/team-context";
import { NewsForm } from "../../NewsForm";
import { notFound } from "next/navigation";

/**
 * Admin News Edit Page
 * Page for editing an existing news article
 */
export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);

  if (isNaN(id)) {
    notFound();
  }

  const teamId = await requireTeamId();
  const newsService = new NewsService();
  const news = await newsService.findById(id, teamId);

  if (!news) {
    notFound();
  }

  const newsData = {
    id: news.id,
    title: news.title,
    contentHtml: news.contentHtml,
    coverImage: news.coverImage ?? null,
    authorId: news.authorId ?? null,
    status: news.status,
    isPublished: news.isPublished,
    publishedAt: news.publishedAt?.toISOString() || null,
    createdAt: news.createdAt.toISOString(),
    updatedAt: news.updatedAt?.toISOString() || null,
  };

  const mediaItems = await newsService.getNewsMedia(id, teamId);
  const newsMedia = mediaItems.map((nm) => ({
    id: nm.newsId, // Using newsId as a unique identifier in the array
    mediaItemId: nm.mediaItemId,
    url: nm.mediaItem.url,
    type: nm.mediaItem.type,
    displayOrder: nm.displayOrder,
  }));

  const mediaItemService = new MediaItemService();
  const allMediaItems = await mediaItemService.findAll(teamId);
  const availableMediaItems = allMediaItems.map((item) => ({
    id: item.id,
    url: item.url,
    type: item.type,
  }));

  return <NewsForm mode="edit" initialData={newsData} initialMedia={newsMedia} availableMediaItems={availableMediaItems} />;
}
