import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Notification } from "./Notification";
import { User } from "./User";

/**
 * NotificationRead Entity — accusé de lecture d'une notification par un
 * compte du club (une ligne = un compte a ouvert/lu une notification
 * donnée). La diffusion (qui PEUT voir une notification) reste calculée
 * dynamiquement par catégorie (`NotificationService.findAll`, inchangé) ;
 * cette table ne fait que tracer qui l'a effectivement lue.
 */
@Entity("cms_notification_reads")
export class NotificationRead {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "notification_id" })
  notificationId!: number;

  @ManyToOne(() => Notification, { onDelete: "CASCADE" })
  @JoinColumn({ name: "notification_id" })
  notification!: Notification;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @CreateDateColumn({ type: "datetime", name: "read_at" })
  readAt!: Date;
}
