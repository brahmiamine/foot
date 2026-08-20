import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Team } from "./Team";
import { Match } from "./Match";
import { FriendlyMatch } from "./FriendlyMatch";
import { User } from "./User";
import type { AgeCategory } from "@/types/categories";

export type TripMatchKind = "OFFICIAL" | "FRIENDLY";
export type TripWorkflowStatus =
  | "DRAFT"
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "READY"
  | "DEPARTED"
  | "COMPLETED"
  | "CANCELLED";

/**
 * Trip Entity — déplacement organisé pour un match à l'extérieur (heure de
 * départ, point de rendez-vous). Véhicules (cms_trip_vehicles) et
 * participants (cms_trip_participants) sont des tables liées. Table propre
 * à cette app, scopée par team_id.
 */
@Entity("cms_trips")
export class Trip {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 10, default: "seniors" })
  category!: AgeCategory;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], nullable: true, name: "match_type" })
  matchType?: TripMatchKind | null;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @ManyToOne(() => Match, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "match_id" })
  match?: Match | null;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

  @ManyToOne(() => FriendlyMatch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "friendly_match_id" })
  friendlyMatch?: FriendlyMatch | null;

  @Column({ type: "datetime", name: "departure_time" })
  departureTime!: Date;

  @Column({ type: "varchar", length: 255, nullable: true, name: "meeting_point" })
  meetingPoint?: string | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({
    type: "enum",
    enum: ["DRAFT", "APPROVAL_PENDING", "APPROVED", "READY", "DEPARTED", "COMPLETED", "CANCELLED"],
    default: "DRAFT",
    name: "workflow_status",
  })
  workflowStatus!: TripWorkflowStatus;

  @Column({ type: "decimal", precision: 12, scale: 3, nullable: true, name: "estimated_budget" })
  estimatedBudget?: string | null;

  @Column({ type: "decimal", precision: 12, scale: 3, nullable: true, name: "approved_budget" })
  approvedBudget?: string | null;

  @Column({ type: "decimal", precision: 12, scale: 3, nullable: true, name: "actual_budget" })
  actualBudget?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "budget_submitted_by" })
  budgetSubmittedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "budget_submitted_at" })
  budgetSubmittedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "budget_approved_at" })
  budgetApprovedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "ready_by" })
  readyBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "ready_at" })
  readyAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "departed_by" })
  departedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "departed_at" })
  departedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "completed_by" })
  completedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "completed_at" })
  completedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "cancelled_by" })
  cancelledBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "cancelled_at" })
  cancelledAt?: Date | null;

  @Column({ type: "text", nullable: true, name: "cancellation_reason" })
  cancellationReason?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by" })
  creator?: User | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
