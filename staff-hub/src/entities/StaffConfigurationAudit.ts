import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type StaffConfigurationSnapshot = Record<string, unknown>;

/**
 * GOV-005 — miroir staff-hub de `cms_configuration_audit` (possédée par
 * club-hub, voir club-hub/src/entities/ClubConfigurationAudit.ts). Journal
 * append-only partagé, utilisé ici pour les domaines STAFF-002/003/004/005.
 */
@Entity("cms_configuration_audit")
export class StaffConfigurationAudit {
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
  scopeId!: string | null;

  @Column({ type: "int", nullable: true, name: "previous_version" })
  previousVersion!: number | null;

  @Column({ type: "int", name: "new_version" })
  newVersion!: number;

  @Column({ type: "json", nullable: true, name: "before_value" })
  before!: StaffConfigurationSnapshot | null;

  @Column({ type: "json", name: "after_value" })
  after!: StaffConfigurationSnapshot;

  @Column({ type: "varchar", length: 191, name: "actor_user_id" })
  actorUserId!: string;

  @Column({ type: "varchar", length: 80, name: "actor_role" })
  actorRole!: string;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "varchar", length: 45, nullable: true, name: "ip_address" })
  ipAddress!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true, name: "user_agent" })
  userAgent!: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
