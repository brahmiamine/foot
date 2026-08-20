import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

/**
 * STAFF-003 — `cms_training_approval_policies` (possédée par club-hub),
 * historique append-only versionné par club. L'absence de ligne active
 * préserve le comportement historique : aucune approbation requise.
 */
@Entity("cms_training_approval_policies")
@Unique("uq_cms_training_approval_policies_version", ["teamId", "version"])
@Index("idx_cms_training_approval_policies_resolution", ["teamId", "effectiveFrom", "effectiveUntil", "version"])
export class TrainingApprovalPolicy {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "tinyint", default: 0, name: "approval_required" })
  approvalRequired!: boolean;

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
