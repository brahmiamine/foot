import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export type HistoryFigureCategory = "PRESIDENT" | "COACH" | "PLAYER" | "TEAM";

/** Mappée sur `cms_history_figures` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_history_figures")
export class HistoryFigure {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "enum", enum: ["PRESIDENT", "COACH", "PLAYER", "TEAM"] })
  category!: HistoryFigureCategory;

  @Column({ type: "varchar", length: 200, name: "name_fr" })
  nameFr!: string;

  @Column({ type: "varchar", length: 100, nullable: true, name: "period_fr" })
  periodFr?: string | null;

  @Column({ type: "text", nullable: true, name: "description_fr" })
  descriptionFr?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "photo_url" })
  photoUrl?: string | null;

  @Column({ type: "int", default: 0, name: "display_order" })
  displayOrder!: number;
}
