import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Player } from "./Player";
import { Team } from "./Team";

export type PlayerTransferType = "PERMANENT" | "LOAN" | "LOAN_RETURN" | "FREE_TRANSFER";
export type PlayerTransferStatus = "DRAFT" | "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED" | "REJECTED";

@Entity("player_transfers")
export class PlayerTransfer {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191, name: "player_id" })
  playerId!: string;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player?: Player;

  @Column({ type: "char", length: 36, name: "from_team_id" })
  fromTeamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "from_team_id" })
  fromTeam?: Team;

  @Column({ type: "char", length: 36, name: "to_team_id" })
  toTeamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "to_team_id" })
  toTeam?: Team;

  @Column({ type: "enum", enum: ["PERMANENT", "LOAN", "LOAN_RETURN", "FREE_TRANSFER"], name: "transfer_type" })
  transferType!: PlayerTransferType;

  @Column({ type: "enum", enum: ["DRAFT", "PENDING", "APPROVED", "COMPLETED", "CANCELLED", "REJECTED"], default: "PENDING" })
  status!: PlayerTransferStatus;

  @Column({ type: "date", name: "effective_date" })
  effectiveDate!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "season_id" })
  seasonId?: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  fee?: string | null;

  @Column({ type: "varchar", length: 8, nullable: true })
  currency?: string | null;

  @Column({ type: "date", nullable: true, name: "loan_start_date" })
  loanStartDate?: string | null;

  @Column({ type: "date", nullable: true, name: "loan_end_date" })
  loanEndDate?: string | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  /** Legacy field kept for backward compatibility with already deployed rows. */
  @Column({ type: "varchar", length: 191, nullable: true, name: "approved_by" })
  approvedBy?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "destination_approved_by" })
  destinationApprovedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "destination_approved_at" })
  destinationApprovedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "homologated_by" })
  homologatedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "homologated_at" })
  homologatedAt?: Date | null;

  @Column({ type: "char", length: 36, nullable: true, name: "transfer_window_id" })
  transferWindowId?: string | null;

  @Column({ type: "char", length: 36, nullable: true, name: "transfer_window_exception_id" })
  transferWindowExceptionId?: string | null;

  @Column({ type: "text", nullable: true, name: "status_reason" })
  statusReason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
