import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_academy_info` (table teamManager), scopée par team_id. Lecture seule. */
@Entity("cms_academy_info")
export class AcademyInfo {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "longtext", nullable: true, name: "philosophy_fr" })
  philosophyFr?: string | null;
  @Column({ type: "longtext", nullable: true, name: "philosophy_ar" })
  philosophyAr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "method_fr" })
  methodFr?: string | null;
  @Column({ type: "longtext", nullable: true, name: "method_ar" })
  methodAr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "supervision_fr" })
  supervisionFr?: string | null;
  @Column({ type: "longtext", nullable: true, name: "supervision_ar" })
  supervisionAr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "infrastructure_fr" })
  infrastructureFr?: string | null;
  @Column({ type: "longtext", nullable: true, name: "infrastructure_ar" })
  infrastructureAr?: string | null;

  @Column({ type: "longtext", nullable: true, name: "detection_fr" })
  detectionFr?: string | null;
  @Column({ type: "longtext", nullable: true, name: "detection_ar" })
  detectionAr?: string | null;
}
