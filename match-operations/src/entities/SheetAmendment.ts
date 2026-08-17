import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { SheetStatus } from "./Sheet";

export type SheetAmendmentStatus = "AMENDMENT_REQUESTED" | "AMENDED" | "RE_SIGNED";
export type SheetAmendmentApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";

@Entity("ms_sheet_amendments")
@Index(["sheetId", "status"])
export class SheetAmendment {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "sheet_id" })
  sheetId!: number;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @Column({ type: "enum", enum: ["AMENDMENT_REQUESTED", "AMENDED", "RE_SIGNED"] })
  status!: SheetAmendmentStatus;

  @Column({ type: "varchar", length: 32, name: "original_sheet_status" })
  originalSheetStatus!: SheetStatus;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "varchar", length: 36, nullable: true, name: "requested_by_user_id" })
  requestedByUserId?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "requested_by_name" })
  requestedByName?: string | null;

  /** Version exacte du CompetitionMatchProtocol appliquée à la demande. */
  @Column({ type: "int", default: 0, name: "protocol_version_used" })
  protocolVersionUsed!: number;

  @Column({
    type: "enum",
    enum: ["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED"],
    default: "NOT_REQUIRED",
    name: "approval_status",
  })
  approvalStatus!: SheetAmendmentApprovalStatus;

  @Column({ type: "varchar", length: 36, nullable: true, name: "decided_by_user_id" })
  decidedByUserId?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "decided_by_name" })
  decidedByName?: string | null;

  @Column({ type: "text", nullable: true, name: "decision_reason" })
  decisionReason?: string | null;

  @Column({ type: "datetime", nullable: true, name: "decided_at" })
  decidedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "requested_at" })
  requestedAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "amended_at" })
  amendedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "re_signed_at" })
  reSignedAt?: Date | null;
}
