import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";

/**
 * History Entity — récit de l'histoire du club (page /club/histoire) et
 * date de création. Un seul enregistrement par club.
 */
@Entity("cms_history")
export class History {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "date", nullable: true, name: "founded_date" })
  foundedDate?: string | null;

  @Column({ type: "longtext", nullable: true, name: "story_fr" })
  storyFr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "story_ar" })
  storyAr?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at", nullable: true })
  updatedAt?: Date | null;
}
