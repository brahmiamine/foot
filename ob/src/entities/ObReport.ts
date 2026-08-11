import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type ObReportTargetType = "POST" | "COMMENT" | "FAN_WALL_ITEM";

@Entity("ob_reports")
export class ObReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "enum", enum: ["POST", "COMMENT", "FAN_WALL_ITEM"], name: "target_type" })
  targetType!: ObReportTargetType;

  @Column({ type: "varchar", length: 191, name: "target_id" })
  targetId!: string;

  @Column({ type: "varchar", length: 191, name: "reported_by" })
  reportedBy!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason?: string | null;

  @Column({ type: "enum", enum: ["OPEN", "RESOLVED", "DISMISSED"], default: "OPEN" })
  status!: "OPEN" | "RESOLVED" | "DISMISSED";

  @Column({ type: "varchar", length: 191, nullable: true, name: "resolved_by" })
  resolvedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "resolved_at" })
  resolvedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
