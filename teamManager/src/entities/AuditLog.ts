import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";

/**
 * AuditLog Entity — mappée sur la table `AuditLog`, partagée avec cardManager.
 * Historique des mutations (CREATE/UPDATE/DELETE) sur les entités du module
 * discipline, alimenté par `AuditLogService.create`.
 */
@Entity("AuditLog")
export class AuditLog {
  @PrimaryColumn({ type: "varchar", length: 191 })
  id!: string;

  @Column({ type: "varchar", length: 191 })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user?: User;

  @Column({ type: "varchar", length: 191 })
  action!: string;

  @Column({ type: "varchar", length: 191 })
  entity!: string;

  @Column({ type: "varchar", length: 191 })
  entityId!: string;

  @Column({ type: "longtext", nullable: true })
  before?: string | null;

  @Column({ type: "longtext", nullable: true })
  after?: string | null;

  @CreateDateColumn({ type: "datetime", precision: 3 })
  createdAt!: Date;
}
