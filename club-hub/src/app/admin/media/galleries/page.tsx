import { MediaGalleryService } from "@/services/MediaGalleryService";
import { MediaItemService } from "@/services/MediaItemService";
import { requireTeamId } from "@/lib/team-context";
import { MediaGalleriesManagement } from "./MediaGalleriesManagement";

/**
 * Plain object type for MediaGallery (serializable)
 */
interface MediaGalleryData {
  id: number;
  titleFr: string;
  titleAr: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  coverImageId: number | null;
  coverImageUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Plain object type for MediaItem (for cover image selection)
 */
interface MediaItemData {
  id: number;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
}

/**
 * Admin Media Galleries Page
 * Unified page with list and form on the same page
 */
export default async function MediaGalleriesPage() {
  const teamId = await requireTeamId();

  const galleryService = new MediaGalleryService();
  const fetchedGalleries = await galleryService.findAll(teamId);
  const galleries: MediaGalleryData[] = fetchedGalleries.map((gallery) => ({
    id: gallery.id,
    titleFr: gallery.titleFr,
    titleAr: gallery.titleAr || null,
    descriptionFr: gallery.descriptionFr || null,
    descriptionAr: gallery.descriptionAr || null,
    coverImageId: gallery.coverImageId || null,
    coverImageUrl: gallery.coverImage?.url || null,
    isPublic: gallery.isPublic,
    createdAt: gallery.createdAt.toISOString(),
    updatedAt: gallery.updatedAt?.toISOString() || null,
  }));

  const mediaItemService = new MediaItemService();
  const fetchedItems = await mediaItemService.findAll(teamId);
  const mediaItems: MediaItemData[] = fetchedItems.map((item) => ({
    id: item.id,
    url: item.url,
    type: item.type,
  }));

  return <MediaGalleriesManagement initialGalleries={galleries} availableMediaItems={mediaItems} />;
}
