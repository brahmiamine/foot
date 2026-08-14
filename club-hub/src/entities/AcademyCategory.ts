import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";

/**
 * AcademyCategory Entity — catégories de la formation/académie (U6 -> U19),
 * affichées sur /formation.
 */
@Entity("cms_academy_categories")
export class AcademyCategory {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 10 })
  code!: string;

  @Column({ type: "varchar", length: 100, name: "name_fr" })
  nameFr!: string;

  @Column({ type: "varchar", length: 100, nullable: true, name: "name_ar" })
  nameAr?: string | null;

  @Column({ type: "varchar", length: 50, nullable: true, name: "age_range_fr" })
  ageRangeFr?: string | null;

  @Column({ type: "text", nullable: true, name: "description_fr" })
  descriptionFr?: string | null;

  @Column({ type: "text", nullable: true, name: "description_ar" })
  descriptionAr?: string | null;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive!: boolean;

  @Column({ type: "int", default: 0, name: "display_order" })
  displayOrder!: number;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
