import { NewsService } from "@/services/NewsService";
import { requireTeamId } from "@/lib/team-context";
import { NewsList } from "./NewsList";

/**
 * Admin News List Page
 * Displays the list of news articles
 */
export default async function NewsPage() {
  const teamId = await requireTeamId();
  const newsService = new NewsService();
  const newsData = await newsService.findAll(teamId);

  const news = newsData.map((newsItem) => ({
    id: newsItem.id,
    title: newsItem.title,
    contentHtml: newsItem.contentHtml,
    coverImage: newsItem.coverImage ?? null,
    authorId: newsItem.authorId ?? null,
    status: newsItem.status,
    isPublished: newsItem.isPublished,
    publishedAt: newsItem.publishedAt?.toISOString() || null,
    createdAt: newsItem.createdAt.toISOString(),
    updatedAt: newsItem.updatedAt?.toISOString() || null,
  }));

  return <NewsList initialNews={news} />;
}
