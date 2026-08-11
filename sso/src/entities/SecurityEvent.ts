import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type SecurityEventType =
  | "LOGIN_FAILED"
  | "LOGIN_RATE_LIMITED"
  | "MFA_FAILED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "PASSWORD_RESET_FAILED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_CHANGE_FAILED";

/**
 * Journal de sécurité — voir src/lib/securityLog.ts. Table propre à `sso`,
 * aucune autre app n'y touche (voir db/OWNERSHIP.md). `email`/`ip` sont des
 * valeurs figées au moment de l'événement (comme `audit_logs` côté
 * arbinote/superadmin) : pas de clé étrangère vers `User`, un échec de
 * connexion avec un email inconnu ne correspond à aucun compte.
 */
@Entity("security_events")
export class SecurityEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50 })
  type!: SecurityEventType;

  @Column({ type: "varchar", length: 191, nullable: true })
  email?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "user_id" })
  userId?: string | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
