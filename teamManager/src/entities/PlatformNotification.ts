import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type NotificationEmailStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

/**
 * PlatformNotification Entity — notification individuelle (in-app + email),
 * table `platform_notifications` PARTAGÉE avec matchsheet (voir
 * roadmap.md §2 "Notifications centralisées"). Contrairement à
 * `Notification`/`cms_notifications` (annonces diffusées par le club, lues
 * en clair par tous), une ligne ici appartient à un seul destinataire
 * (`userId`), fan-out à la création — chaque user a son propre statut de
 * lecture (`readAt`).
 */
@Entity("platform_notifications")
export class PlatformNotification {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "char", length: 36, nullable: true, name: "team_id" })
  teamId?: string | null;

  @Column({ type: "varchar", length: 20, name: "source_app" })
  sourceApp!: string;

  @Column({ type: "varchar", length: 50 })
  type!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  url?: string | null;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @Column({ type: "tinyint", default: 0, name: "is_urgent" })
  isUrgent!: boolean;

  @Column({ type: "datetime", nullable: true, name: "read_at" })
  readAt?: Date | null;

  @Column({
    type: "enum",
    enum: ["PENDING", "SENT", "FAILED", "SKIPPED"],
    default: "PENDING",
    name: "email_status",
  })
  emailStatus!: NotificationEmailStatus;

  @Column({ type: "datetime", nullable: true, name: "email_sent_at" })
  emailSentAt?: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "email_error" })
  emailError?: string | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
