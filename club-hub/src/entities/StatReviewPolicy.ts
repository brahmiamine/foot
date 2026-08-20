import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

/**
 * STAFF-004 — `cms_stat_review_policies`, historique append-only versionné
 * par club. Miroir de staff-hub/src/entities/StatReviewPolicy.ts (même
 * table) : staff-hub porte l'administration (page `/parametres`), club-hub
 * ne fait que relire la même policy pour garder `PlayerStatService.delete`
 * cohérent avec le verrouillage appliqué côté staff-hub. L'absence de ligne
 * active retombe sur une fenêtre de revue par défaut de 72h.
 */
@Entity("cms_stat_review_policies")
@Unique("uq_cms_stat_review_policies_version", ["teamId", "version"])
@Index("idx_cms_stat_review_policies_resolution", ["teamId", "effectiveFrom", "effectiveUntil", "version"])
export class StatReviewPolicy {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "int", default: 72, name: "review_window_hours" })
  reviewWindowHours!: number;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "datetime", nullable: true, name: "effective_from" })
  effectiveFrom!: Date | null;

  @Column({ type: "datetime", nullable: true, name: "effective_until" })
  effectiveUntil!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy!: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
