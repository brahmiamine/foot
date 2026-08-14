import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";

export type HistoryFigureCategory = "PRESIDENT" | "COACH" | "PLAYER" | "TEAM";

/**
 * HistoryFigure Entity — présidents/entraîneurs historiques, grandes
 * figures et grandes équipes du club, affichés sur /club/histoire.
 */
@Entity("cms_history_figures")
export class HistoryFigure {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "enum", enum: ["PRESIDENT", "COACH", "PLAYER", "TEAM"] })
  category!: HistoryFigureCategory;

  @Column({ type: "varchar", length: 200, name: "name_fr" })
  nameFr!: string;

  @Column({ type: "varchar", length: 200, nullable: true, name: "name_ar" })
  nameAr?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "period_fr" })
  periodFr?: string | null;

  @Column({ type: "text", nullable: true, name: "description_fr" })
  descriptionFr?: string | null;

  @Column({ type: "text", nullable: true, name: "description_ar" })
  descriptionAr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "photo_url" })
  photoUrl?: string | null;

  @Column({ type: "int", default: 0, name: "display_order" })
  displayOrder!: number;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
