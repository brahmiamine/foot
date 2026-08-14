import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_recruitment_needs` (table club-hub), scopée par team_id. Lecture seule. */
@Entity("cms_recruitment_needs")
export class RecruitmentNeed {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 20 })
  category!: string;

  @Column({ type: "varchar", length: 50 })
  position!: string;

  @Column({ type: "text", nullable: true, name: "description_fr" })
  descriptionFr?: string | null;
  @Column({ type: "text", nullable: true, name: "description_ar" })
  descriptionAr?: string | null;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive!: boolean;

  @Column({ type: "int", default: 0, name: "display_order" })
  displayOrder!: number;
}
