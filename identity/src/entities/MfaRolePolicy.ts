import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import type { User } from "./User";

export type MfaPolicyMode = "REQUIRED" | "OPTIONAL" | "DISABLED";

/** Identity-owned MFA requirement per platform role. */
@Entity("identity_mfa_role_policies")
export class MfaRolePolicy {
  @PrimaryColumn({ type: "varchar", length: 50 })
  role!: User["role"];

  @Column({ type: "simple-enum", enum: ["REQUIRED", "OPTIONAL", "DISABLED"], default: "OPTIONAL" })
  mode!: MfaPolicyMode;

  /** Zero means immediate enforcement; positive values stage REQUIRED rollout. */
  @Column({ type: "int", name: "grace_period_days", default: 0 })
  gracePeriodDays!: number;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
