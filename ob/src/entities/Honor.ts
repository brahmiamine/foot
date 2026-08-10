import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_honors` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_honors")
export class Honor {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 150, name: "competition_fr" })
  competitionFr!: string;

  @Column({ type: "int", default: 0, name: "title_count" })
  titleCount!: number;

  @Column({ type: "varchar", length: 255, nullable: true, name: "years_fr" })
  yearsFr?: string | null;

  @Column({ type: "varchar", length: 10, nullable: true })
  icon?: string | null;

  @Column({ type: "int", default: 0, name: "display_order" })
  displayOrder!: number;
}
