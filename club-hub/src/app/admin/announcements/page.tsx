import { AnnouncementService } from "@/services/AnnouncementService";
import { requireTeamId } from "@/lib/team-context";
import { AnnouncementsManagement } from "./AnnouncementsManagement";

export const dynamic = "force-dynamic";

/** Admin — communiqués officiels du club (page publique /communiques). */
export default async function AnnouncementsPage() {
  const teamId = await requireTeamId();
  const announcements = await new AnnouncementService().findAll(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Communiqués officiels</h1>
      <AnnouncementsManagement
        initialAnnouncements={announcements.map((a) => ({
          id: a.id,
          title: a.title,
          contentHtml: a.contentHtml,
          category: a.category,
          isPublished: a.isPublished,
          publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
