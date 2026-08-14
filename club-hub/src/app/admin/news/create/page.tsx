import { MediaItemService } from "@/services/MediaItemService";
import { requireTeamId } from "@/lib/team-context";
import { NewsForm } from "../NewsForm";

/**
 * Admin News Create Page
 * Page for creating a new news article
 */
export default async function CreateNewsPage() {
  const teamId = await requireTeamId();
  const mediaItemService = new MediaItemService();
  const items = await mediaItemService.findAll(teamId);
  const availableMediaItems = items.map((item) => ({
    id: item.id,
    url: item.url,
    type: item.type,
  }));

  return <NewsForm mode="create" availableMediaItems={availableMediaItems} />;
}
