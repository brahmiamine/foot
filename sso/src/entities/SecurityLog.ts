import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

/**
 * Journal de sécurité transverse à `sso` (authentification), distinct des
 * `AuditLog`/`audit_logs` d'arbinote/superadmin/teamManager qui journalisent
 * des actions d'administration métier — voir avancement.md § 4 « Journal de
 * sécurité transverse ». Table propre à `sso`, aucune autre app n'y touche
 * (voir db/OWNERSHIP.md).
 */
export type SecurityEventType =
  | "LOGIN_FAILED"
  | "LOGIN_RATE_LIMITED"
  | "INVALID_TOKEN"
  | "PASSWORD_RESET_REQUESTED"
  | "MFA_ENABLED"
  | "MFA_DISABLED"
  | "MFA_VERIFY_FAILED"
  | "SESSION_REVOKED";

@Entity("security_logs")
export class SecurityLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, name: "event_type" })
  eventType!: SecurityEventType;

  /** Nullable : une tentative de login échouée sur un email inconnu n'a pas de compte à rattacher. */
  @Column({ type: "varchar", length: 191, nullable: true, name: "user_id" })
  userId?: string | null;

  /** Conservé même quand `userId` est connu (lisible sans jointure dans la vue admin). */
  @Column({ type: "varchar", length: 191, nullable: true })
  email?: string | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip?: string | null;

  @Column({ type: "text", nullable: true })
  detail?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
