import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Assignment, type AssignmentRole } from "./Assignment";
import { Match } from "./Match";

export type RefereeMatchReportStatus = "DRAFT" | "SUBMITTED" | "AMENDMENT_REQUESTED" | "AMENDED";
export type RefereeMatchReportType = "REFEREE_COMPLEMENTARY" | "MATCH_DELEGATE" | "REFEREE_OBSERVER";
export type RefereeMatchReportCategory = "GENERAL" | "SECURITY" | "ORGANIZATION" | "DISCIPLINE" | "TECHNICAL" | "OTHER";

@Entity("referee_match_reports")
export class RefereeMatchReport {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "assignment_id" })
  assignmentId!: number;

  @ManyToOne(() => Assignment, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "assignment_id" })
  assignment?: Assignment;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "match_id" })
  match?: Match;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 64 })
  role!: AssignmentRole;

  @Column({
    type: "enum",
    enum: ["REFEREE_COMPLEMENTARY", "MATCH_DELEGATE", "REFEREE_OBSERVER"],
    name: "report_type",
    default: "REFEREE_COMPLEMENTARY",
  })
  reportType!: RefereeMatchReportType;

  @Column({ type: "varchar", length: 180 })
  subject!: string;

  @Column({
    type: "enum",
    enum: ["GENERAL", "SECURITY", "ORGANIZATION", "DISCIPLINE", "TECHNICAL", "OTHER"],
    default: "GENERAL",
  })
  category!: RefereeMatchReportCategory;

  @Column({ type: "text" })
  content!: string;

  @Column({
    type: "enum",
    enum: ["DRAFT", "SUBMITTED", "AMENDMENT_REQUESTED", "AMENDED"],
    default: "DRAFT",
  })
  status!: RefereeMatchReportStatus;

  @Column({ type: "datetime", nullable: true, name: "submitted_at" })
  submittedAt?: Date | null;

  /** REF-004 — motif de la demande d'amendement en cours (jamais de correction silencieuse). */
  @Column({ type: "varchar", length: 500, nullable: true, name: "amendment_reason" })
  amendmentReason?: string | null;

  @Column({ type: "datetime", nullable: true, name: "amendment_requested_at" })
  amendmentRequestedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "amended_at" })
  amendedAt?: Date | null;

  @Column({ type: "int", default: 0, name: "amendment_count" })
  amendmentCount!: number;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
