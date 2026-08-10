import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";

/**
 * Honor Entity — palmarès du club (titres, coupes, records), affiché sur
 * /club/histoire. Ex: "Championnat — 3 titres — 1985, 1990, 1998".
 */
@Entity("cms_honors")
export class Honor {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 150, name: "competition_fr" })
  competitionFr!: string;

  @Column({ type: "varchar", length: 150, nullable: true, name: "competition_ar" })
  competitionAr?: string | null;

  @Column({ type: "int", default: 0, name: "title_count" })
  titleCount!: number;

  @Column({ type: "varchar", length: 255, nullable: true, name: "years_fr" })
  yearsFr?: string | null;

  @Column({ type: "varchar", length: 10, nullable: true })
  icon?: string | null;

  @Column({ type: "int", default: 0, name: "display_order" })
  displayOrder!: number;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
