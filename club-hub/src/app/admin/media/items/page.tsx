import { MediaItemService } from "@/services/MediaItemService";
import { requireTeamId } from "@/lib/team-context";
import { MediaItemsManagement } from "./MediaItemsManagement";

/**
 * Plain object type for MediaItem (serializable)
 */
interface MediaItemData {
  id: number;
  uploaderId: number | null;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
  mimeType: string | null;
  altTextFr: string | null;
  altTextAr: string | null;
  createdAt: string;
}

/**
 * Admin Media Items Page
 * Unified page with list and form on the same page
 */
export default async function MediaItemsPage() {
  const teamId = await requireTeamId();
  const mediaItemService = new MediaItemService();
  const fetchedItems = await mediaItemService.findAll(teamId);

  const mediaItems: MediaItemData[] = fetchedItems.map((item) => ({
    id: item.id,
    uploaderId: item.uploaderId || null,
    url: item.url,
    type: item.type,
    mimeType: item.mimeType || null,
    altTextFr: item.altTextFr || null,
    altTextAr: item.altTextAr || null,
    createdAt: item.createdAt.toISOString(),
  }));

  return <MediaItemsManagement initialMediaItems={mediaItems} />;
}
