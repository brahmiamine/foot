import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { News } from "./News";
import { MediaItem } from "./MediaItem";

/**
 * News Media Entity
 * Junction table for many-to-many relationship between News and MediaItem
 * Includes display order for sorting media items in news
 */
@Entity("cms_news_media")
export class NewsMedia {
  @PrimaryColumn({ type: "bigint", name: "news_id" })
  newsId!: number;

  @ManyToOne(() => News, { onDelete: "CASCADE" })
  @JoinColumn({ name: "news_id" })
  news!: News;

  @PrimaryColumn({ type: "bigint", name: "media_item_id" })
  mediaItemId!: number;

  @ManyToOne(() => MediaItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "media_item_id" })
  mediaItem!: MediaItem;

  @Column({ type: "int", default: 0, name: "display_order" })
  displayOrder!: number;
}

