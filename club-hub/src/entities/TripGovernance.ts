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

export type TripBudgetApprovalMode = "SINGLE_APPROVAL" | "DUAL_APPROVAL";
export type TripBudgetApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

@Entity("cms_trip_governance_settings")
export class TripGovernanceSettings {
  @PrimaryColumn({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "decimal", precision: 12, scale: 3, default: "0.000", name: "dual_approval_threshold" })
  dualApprovalThreshold!: string;

  @Column({ type: "decimal", precision: 12, scale: 3, default: "0.000", name: "receipt_required_threshold" })
  receiptRequiredThreshold!: string;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

@Entity("cms_trip_budget_approvals")
@Index(["teamId", "status", "createdAt"])
@Index(["teamId", "tripId", "status"])
export class TripBudgetApproval {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "bigint", name: "trip_id" })
  tripId!: number;

  @Column({ type: "varchar", length: 191, name: "maker_user_id" })
  makerUserId!: string;

  @Column({ type: "simple-enum", enum: ["SINGLE_APPROVAL", "DUAL_APPROVAL"], name: "approval_mode" })
  approvalMode!: TripBudgetApprovalMode;

  @Column({ type: "int", name: "required_approvals" })
  requiredApprovals!: number;

  @Column({ type: "decimal", precision: 12, scale: 3, name: "estimated_budget_snapshot" })
  estimatedBudgetSnapshot!: string;

  @Column({ type: "decimal", precision: 12, scale: 3, name: "threshold_snapshot" })
  thresholdSnapshot!: string;

  @Column({ type: "varchar", length: 64, name: "trip_fingerprint" })
  tripFingerprint!: string;

  @Column({
    type: "simple-enum",
    enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
    default: "PENDING",
  })
  status!: TripBudgetApprovalStatus;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason?: string | null;

  @Column({ type: "datetime", nullable: true, name: "resolved_at" })
  resolvedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

@Entity("cms_trip_budget_decisions")
@Unique(["approvalId", "actorUserId"])
export class TripBudgetDecision {
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

@Entity("cms_trip_expense_receipts")
@Index(["teamId", "tripId", "createdAt"])
export class TripExpenseReceipt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "bigint", name: "trip_id" })
  tripId!: number;

  @Column({ type: "varchar", length: 150 })
  label!: string;

  @Column({ type: "decimal", precision: 12, scale: 3 })
  amount!: string;

  @Column({ type: "varchar", length: 255, name: "document_url" })
  documentUrl!: string;

  @Column({ type: "varchar", length: 191, name: "created_by" })
  createdBy!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}

@Entity("cms_trip_workflow_events")
@Index(["teamId", "tripId", "createdAt"])
export class TripWorkflowEvent {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "bigint", name: "trip_id" })
  tripId!: number;

  @Column({ type: "bigint", nullable: true, name: "participant_id" })
  participantId?: number | null;

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
