import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_media_items` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_media_items")
export class MediaItem {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 255 })
  url!: string;

  @Column({
    type: "enum",
    enum: ["IMAGE", "VIDEO", "DOCUMENT", "AUDIO"],
    default: "IMAGE",
  })
  type!: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";

  @Column({ type: "varchar", length: 255, nullable: true, name: "alt_text_fr" })
  altTextFr?: string | null;
}
