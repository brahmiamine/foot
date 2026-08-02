import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { MediaGallery } from "./MediaGallery";
import { MediaItem } from "./MediaItem";

/**
 * Media Gallery Item Entity
 * Junction table for many-to-many relationship between MediaGallery and MediaItem
 * Includes display order for sorting items in a gallery
 */
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

