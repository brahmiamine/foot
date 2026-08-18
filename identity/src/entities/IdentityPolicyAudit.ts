import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export interface MfaRolePolicySnapshot {
  role: string;
  mode: string;
  gracePeriodDays: number;
  version: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
}

@Entity("identity_policy_audit")
export class IdentityPolicyAudit {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 80 })
  domain!: string;

  @Index()
  @Column({ type: "varchar", length: 120, name: "configuration_key" })
  configurationKey!: string;

  @Column({ type: "varchar", length: 50, name: "scope_type" })
  scopeType!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "scope_id" })
  scopeId?: string | null;

  @Column({ type: "int", nullable: true, name: "previous_version" })
  previousVersion?: number | null;

  @Column({ type: "int", name: "new_version" })
  newVersion!: number;

  @Column({ type: "simple-json", nullable: true, name: "before_value" })
  before?: MfaRolePolicySnapshot | null;

  @Column({ type: "simple-json", name: "after_value" })
  after!: MfaRolePolicySnapshot;

  @Column({ type: "varchar", length: 191, name: "actor_user_id" })
  actorUserId!: string;

  @Column({ type: "varchar", length: 50, name: "actor_role" })
  actorRole!: string;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "varchar", length: 45, nullable: true, name: "ip_address" })
  ipAddress?: string | null;

  @Column({ type: "varchar", length: 512, nullable: true, name: "user_agent" })
  userAgent?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}