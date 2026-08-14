import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { MediaGallery } from "./MediaGallery";
import { Match } from "./Match";

/**
 * Match Gallery Entity
 * Junction table linking a shared match (table `matches`) to a CMS media
 * gallery (`cms_media_galleries`).
 */
@Entity("cms_match_galleries")
export class MatchGallery {
  @PrimaryColumn({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match, { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match!: Match;

  @PrimaryColumn({ type: "bigint", name: "gallery_id" })
  galleryId!: number;

  @ManyToOne(() => MediaGallery, { onDelete: "CASCADE" })
  @JoinColumn({ name: "gallery_id" })
  gallery!: MediaGallery;
}
