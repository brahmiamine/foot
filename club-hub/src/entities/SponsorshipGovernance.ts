import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export type SponsorContractApprovalMode = "SINGLE_APPROVAL" | "DUAL_APPROVAL";
export type SponsorContractApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

@Entity("cms_sponsorship_governance_settings")
export class SponsorshipGovernanceSettings {
  @PrimaryColumn({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  /**
   * Montant à partir duquel deux approbateurs distincts sont requis.
   * 0 par défaut = fail-safe : double approbation de tous les contrats tant
   * que le club n'a pas explicitement configuré son seuil.
   */
  @Column({ type: "decimal", precision: 12, scale: 3, default: "0.000", name: "dual_approval_threshold" })
  dualApprovalThreshold!: string;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

@Entity("cms_sponsor_contract_approvals")
@Index(["teamId", "status", "createdAt"])
@Index(["teamId", "sponsorId", "status"])
export class SponsorContractApproval {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "bigint", name: "sponsor_id" })
  sponsorId!: number;

  @Column({ type: "varchar", length: 191, name: "maker_user_id" })
  makerUserId!: string;

  @Column({ type: "simple-enum", enum: ["SINGLE_APPROVAL", "DUAL_APPROVAL"], name: "approval_mode" })
  approvalMode!: SponsorContractApprovalMode;

  @Column({ type: "int", name: "required_approvals" })
  requiredApprovals!: number;

  @Column({ type: "decimal", precision: 12, scale: 3, name: "contract_amount_snapshot" })
  contractAmountSnapshot!: string;

  @Column({ type: "decimal", precision: 12, scale: 3, name: "threshold_snapshot" })
  thresholdSnapshot!: string;

  @Column({ type: "varchar", length: 64, name: "contract_fingerprint" })
  contractFingerprint!: string;

  @Column({
    type: "simple-enum",
    enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
    default: "PENDING",
  })
  status!: SponsorContractApprovalStatus;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason?: string | null;

  @Column({ type: "datetime", nullable: true, name: "resolved_at" })
  resolvedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

@Entity("cms_sponsor_contract_decisions")
@Unique(["approvalId", "actorUserId"])
export class SponsorContractDecision {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "approval_id" })
  approvalId!: string;

  @Column({ type: "varchar", length: 191, name: "actor_user_id" })
  actorUserId!: string;

  @Column({ type: "simple-enum", enum: ["APPROVE", "REJECT"] })
  decision!: "APPROVE" | "REJECT";

  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

@Entity("cms_sponsor_workflow_events")
@Index(["teamId", "sponsorRequestId", "createdAt"])
@Index(["teamId", "sponsorId", "createdAt"])
export class SponsorWorkflowEvent {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "bigint", nullable: true, name: "sponsor_request_id" })
  sponsorRequestId?: number | null;

  @Column({ type: "bigint", nullable: true, name: "sponsor_id" })
  sponsorId?: number | null;

  @Column({ type: "varchar", length: 191, name: "actor_user_id" })
  actorUserId!: string;

  @Column({ type: "varchar", length: 64 })
  transition!: string;

  @Column({ type: "varchar", length: 64, nullable: true, name: "from_status" })
  fromStatus?: string | null;

  @Column({ type: "varchar", length: 64, name: "to_status" })
  toStatus!: string;

  @Column({ type: "longtext", nullable: true })
  details?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
