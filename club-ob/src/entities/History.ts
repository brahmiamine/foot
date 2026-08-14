import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_history` (table club-hub), scopée par team_id. Lecture seule. */
@Entity("cms_history")
export class History {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "date", nullable: true, name: "founded_date" })
  foundedDate?: string | null;

  @Column({ type: "longtext", nullable: true, name: "story_fr" })
  storyFr?: string | null;
  @Column({ type: "longtext", nullable: true, name: "story_ar" })
  storyAr?: string | null;
}
