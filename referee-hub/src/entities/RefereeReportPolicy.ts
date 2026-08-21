import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { AssignmentRole } from "./Assignment";

export type RefereeReportPolicyScopeType = "PLATFORM";

export interface RefereeReportPolicyValues {
  mandatoryRoles: AssignmentRole[];
  deadlineHoursAfterMatch: number;
  reminderHoursBeforeDeadline: number;
  escalationHoursAfterDeadline: number;
}

/**
 * REF-004 — policy versionnée (GOV-001/GOV-004) : rôles pour lesquels le
 * rapport d'officiel est obligatoire, délai de dépôt après le match, et
 * fenêtres de rappel/escalade (GOV-008 `workflow-sla`).
 */
@Entity("referee_report_policies")
@Index(["scopeType", "scopeId"])
export class RefereeReportPolicy {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "enum", enum: ["PLATFORM"], name: "scope_type" })
  scopeType!: RefereeReportPolicyScopeType;

  @Column({ type: "char", length: 36, nullable: true, name: "scope_id" })
  scopeId!: string | null;

  @Column({ type: "int" })
  version!: number;

  @Column({ type: "datetime", nullable: true, name: "effective_from" })
  effectiveFrom!: Date | null;

  @Column({ type: "datetime", nullable: true, name: "effective_until" })
  effectiveUntil!: Date | null;

  @Column({ type: "json", name: "values_json" })
  values!: Partial<RefereeReportPolicyValues>;

  @Column({ type: "varchar", length: 191, name: "updated_by" })
  updatedBy!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
