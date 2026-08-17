import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type ReplacementRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "RESOLVED";

@Entity("referee_replacement_requests")
@Index(["userId", "status", "createdAt"])
@Index(["matchId", "status", "createdAt"])
export class ReplacementRequest {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "assignment_id" })
  assignmentId!: number;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "varchar", length: 500 })
  reason!: string;

  @Column({
    type: "enum",
    enum: ["PENDING", "APPROVED", "REJECTED", "RESOLVED"],
    default: "PENDING",
  })
  status!: ReplacementRequestStatus;

  @Column({ type: "varchar", length: 191, nullable: true, name: "reviewed_by" })
  reviewedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "reviewed_at" })
  reviewedAt?: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "review_note" })
  reviewNote?: string | null;

  @Column({ type: "bigint", nullable: true, name: "replacement_assignment_id" })
  replacementAssignmentId?: number | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
