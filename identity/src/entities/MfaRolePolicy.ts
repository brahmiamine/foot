import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import type { User } from "./User";

export type MfaPolicyMode = "REQUIRED" | "OPTIONAL" | "DISABLED";

/** Identity-owned MFA requirement per platform role, stored as immutable versions. */
@Entity("identity_mfa_role_policies")
@Unique("uq_identity_mfa_role_policy_version", ["role", "version"])
@Index("idx_identity_mfa_role_policy_active", ["role", "effectiveFrom", "effectiveUntil", "version"])
export class MfaRolePolicy {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50 })
  role!: User["role"];

  @Column({ type: "simple-enum", enum: ["REQUIRED", "OPTIONAL", "DISABLED"], default: "OPTIONAL" })
  mode!: MfaPolicyMode;

  /** Zero means immediate enforcement; positive values stage REQUIRED rollout. */
  @Column({ type: "int", name: "grace_period_days", default: 0 })
  gracePeriodDays!: number;

  /** Monotonic snapshot version, incremented on every configuration change. */
  @Column({ type: "int", default: 1 })
  version!: number;

  /** Inclusive activation timestamp. NULL means active since creation/history start. */
  @Column({ type: "datetime", nullable: true, name: "effective_from" })
  effectiveFrom?: Date | null;

  /** Exclusive expiration timestamp. NULL means no planned expiration. */
  @Column({ type: "datetime", nullable: true, name: "effective_until" })
  effectiveUntil?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}