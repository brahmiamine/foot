import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { MediaGallery } from "./MediaGallery";
import { MediaItem } from "./MediaItem";

/** Mappée sur `cms_media_gallery_items` (table club-hub). Lecture seule. */
@Entity("cms_media_gallery_items")
export class MediaGalleryItem {
  @PrimaryColumn({ type: "bigint", name: "gallery_id" })
  galleryId!: number;

  @ManyToOne(() => MediaGallery, { onDelete: "CASCADE" })
  @JoinColumn({ name: "gallery_id" })
  gallery!: MediaGallery;

  @PrimaryColumn({ type: "bigint", name: "media_item_id" })
  mediaItemId!: number;

  @ManyToOne(() => MediaItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "media_item_id" })
  mediaItem!: MediaItem;

  @Column({ type: "int", default: 0, name: "display_order" })
  displayOrder!: number;
}
