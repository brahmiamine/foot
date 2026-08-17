import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type AssignmentResponseStatus = "PENDING_ACCEPTANCE" | "ACCEPTED" | "DECLINED";

@Entity("referee_assignment_responses")
@Index(["userId", "status", "responseDeadline"])
export class AssignmentResponse {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Index({ unique: true })
  @Column({ type: "bigint", name: "assignment_id" })
  assignmentId!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({
    type: "enum",
    enum: ["PENDING_ACCEPTANCE", "ACCEPTED", "DECLINED"],
    default: "PENDING_ACCEPTANCE",
  })
  status!: AssignmentResponseStatus;

  @Column({ type: "datetime", name: "response_deadline" })
  responseDeadline!: Date;

  @Column({ type: "datetime", nullable: true, name: "responded_at" })
  respondedAt?: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "decline_reason" })
  declineReason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
