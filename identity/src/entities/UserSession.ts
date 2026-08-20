import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("identity_user_sessions")
@Index("idx_identity_user_sessions_user_active", ["userId", "revokedAt", "expiresAt"])
export class UserSession {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "int", name: "token_version" })
  tokenVersion!: number;

  @Column({ type: "varchar", length: 45, nullable: true, name: "ip_address" })
  ipAddress?: string | null;

  @Column({ type: "varchar", length: 512, nullable: true, name: "user_agent" })
  userAgent?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "datetime", name: "last_seen_at" })
  lastSeenAt!: Date;

  @Column({ type: "datetime", name: "expires_at" })
  expiresAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "revoked_at" })
  revokedAt?: Date | null;

  @Column({ type: "varchar", length: 64, nullable: true, name: "revoked_reason" })
  revokedReason?: string | null;
}
