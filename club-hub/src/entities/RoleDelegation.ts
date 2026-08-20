import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { AgeCategory } from "@/types/categories";

@Entity("cms_role_delegations")
@Index("idx_cms_role_delegations_delegatee_window", ["teamId", "delegateeUserId", "validFrom", "validUntil"])
@Index("idx_cms_role_delegations_delegator", ["teamId", "delegatorUserId"])
export class RoleDelegation {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "varchar", length: 191, name: "delegator_user_id" })
  delegatorUserId!: string;

  @Column({ type: "varchar", length: 191, name: "delegatee_user_id" })
  delegateeUserId!: string;

  @Column({ type: "text" })
  permissions!: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  category?: AgeCategory | null;

  @Column({ type: "datetime", name: "valid_from" })
  validFrom!: Date;

  @Column({ type: "datetime", name: "valid_until" })
  validUntil!: Date;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "datetime", nullable: true, name: "revoked_at" })
  revokedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "revoked_by" })
  revokedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "revocation_reason" })
  revocationReason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
