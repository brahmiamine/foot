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

export type ClubApprovalMode = "AUTO" | "SINGLE_APPROVAL" | "DUAL_APPROVAL";
export type ClubApprovalDomain = "NEWS" | "ANNOUNCEMENT" | "CLUB_PRODUCT";
export type ClubApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type ClubApprovalDecisionType = "APPROVE" | "REJECT";

@Entity("cms_club_governance_settings")
export class ClubGovernanceSettings {
  @PrimaryColumn({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "tinyint", default: 1, name: "maker_checker_enabled" })
  makerCheckerEnabled!: boolean;

  @Column({ type: "simple-enum", enum: ["AUTO", "SINGLE_APPROVAL", "DUAL_APPROVAL"], default: "SINGLE_APPROVAL", name: "news_approval_mode" })
  newsApprovalMode!: ClubApprovalMode;

  @Column({ type: "tinyint", default: 1, name: "news_reapproval_on_sensitive_change" })
  newsReapprovalOnSensitiveChange!: boolean;

  @Column({ type: "simple-enum", enum: ["AUTO", "SINGLE_APPROVAL", "DUAL_APPROVAL"], default: "SINGLE_APPROVAL", name: "announcement_default_approval_mode" })
  announcementDefaultApprovalMode!: ClubApprovalMode;

  @Column({ type: "simple-enum", enum: ["AUTO", "SINGLE_APPROVAL", "DUAL_APPROVAL"], default: "DUAL_APPROVAL", name: "announcement_decision_approval_mode" })
  announcementDecisionApprovalMode!: ClubApprovalMode;

  @Column({ type: "simple-enum", enum: ["AUTO", "SINGLE_APPROVAL", "DUAL_APPROVAL"], default: "DUAL_APPROVAL", name: "announcement_sanction_approval_mode" })
  announcementSanctionApprovalMode!: ClubApprovalMode;

  @Column({ type: "simple-enum", enum: ["AUTO", "SINGLE_APPROVAL", "DUAL_APPROVAL"], default: "SINGLE_APPROVAL", name: "shop_product_approval_mode" })
  shopProductApprovalMode!: ClubApprovalMode;

  @Column({ type: "tinyint", default: 1, name: "shop_product_reapproval_on_sensitive_change" })
  shopProductReapprovalOnSensitiveChange!: boolean;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

@Entity("cms_approval_requests")
@Index(["teamId", "status", "createdAt"])
@Index(["teamId", "domain", "entityId", "status"])
export class ClubApprovalRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "simple-enum", enum: ["NEWS", "ANNOUNCEMENT", "CLUB_PRODUCT"] })
  domain!: ClubApprovalDomain;

  @Column({ type: "varchar", length: 191, name: "entity_id" })
  entityId!: string;

  @Column({ type: "varchar", length: 50, default: "PUBLISH" })
  action!: "PUBLISH";

  @Column({ type: "varchar", length: 191, name: "maker_user_id" })
  makerUserId!: string;

  @Column({ type: "simple-enum", enum: ["SINGLE_APPROVAL", "DUAL_APPROVAL"] })
  approvalMode!: Exclude<ClubApprovalMode, "AUTO">;

  @Column({ type: "int", name: "required_approvals" })
  requiredApprovals!: number;

  @Column({ type: "varchar", length: 64, name: "content_fingerprint" })
  contentFingerprint!: string;

  @Column({ type: "simple-enum", enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"], default: "PENDING" })
  status!: ClubApprovalStatus;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason?: string | null;

  @Column({ type: "datetime", nullable: true, name: "resolved_at" })
  resolvedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}

@Entity("cms_approval_decisions")
@Unique(["requestId", "actorUserId"])
export class ClubApprovalDecision {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "request_id" })
  requestId!: string;

  @Column({ type: "varchar", length: 191, name: "actor_user_id" })
  actorUserId!: string;

  @Column({ type: "simple-enum", enum: ["APPROVE", "REJECT"] })
  decision!: ClubApprovalDecisionType;

  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
