import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_academy_categories` (table club-hub), scopée par team_id. Lecture seule. */
@Entity("cms_academy_categories")
export class AcademyCategory {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

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
}
