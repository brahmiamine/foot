import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { WorkflowSlaAlertStage } from "../../../packages/domain-contracts/src/workflow-sla";

export type RefereeReportSlaAlertStatus = "PENDING" | "SENT";

/**
 * REF-004 — déduplication idempotente des rappels/escalades de rapports
 * d'officiels (même schéma que `regulatory_sla_alert_events` en
 * federation-hub) : une ligne par `event_id`, verrou court pour éviter les
 * doubles envois en cas de cron concurrent.
 */
@Entity("referee_report_sla_alerts")
export class RefereeReportSlaAlert {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "varchar", length: 191, unique: true, name: "event_id" })
  eventId!: string;

  @Column({ type: "bigint", name: "assignment_id" })
  assignmentId!: number;

  @Column({ type: "varchar", length: 20 })
  stage!: WorkflowSlaAlertStage;

  @Column({ type: "enum", enum: ["PENDING", "SENT"], default: "PENDING" })
  status!: RefereeReportSlaAlertStatus;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @Column({ type: "varchar", length: 500, nullable: true, name: "last_error" })
  lastError!: string | null;

  @Column({ type: "datetime", nullable: true, name: "locked_at" })
  lockedAt!: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
