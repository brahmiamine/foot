import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { User } from "./User";
import { Role } from "./Role";
import { AgeCategory } from "@/types/categories";

/**
 * Direct role assignment. Legacy assignments remain permanent when both
 * validity bounds are null. Temporary grants use the half-open interval
 * `[validFrom, validUntil)` and can be explicitly revoked without deleting
 * their audit evidence.
 */
@Entity("cms_user_roles")
export class UserRole {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "bigint", name: "role_id" })
  roleId!: number;

  @ManyToOne(() => Role, { onDelete: "CASCADE" })
  @JoinColumn({ name: "role_id" })
  role!: Role;

  @Column({ type: "varchar", length: 10, nullable: true })
  category?: AgeCategory | null;

  @Column({ type: "datetime", nullable: true, name: "valid_from" })
  validFrom?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "valid_until" })
  validUntil?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "granted_by" })
  grantedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "grant_reason" })
  grantReason?: string | null;

  @Column({ type: "datetime", nullable: true, name: "revoked_at" })
  revokedAt?: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "revoked_by" })
  revokedBy?: string | null;

  @Column({ type: "text", nullable: true, name: "revocation_reason" })
  revocationReason?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
