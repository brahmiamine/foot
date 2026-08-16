import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Assignment, type AssignmentRole } from "./Assignment";
import { Match } from "./Match";

export type RefereeMatchReportStatus = "DRAFT" | "SUBMITTED";
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

  @Column({ type: "enum", enum: ["DRAFT", "SUBMITTED"], default: "DRAFT" })
  status!: RefereeMatchReportStatus;

  @Column({ type: "datetime", nullable: true, name: "submitted_at" })
  submittedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
