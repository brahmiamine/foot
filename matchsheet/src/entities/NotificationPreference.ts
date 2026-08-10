import { Entity, PrimaryColumn, Column, UpdateDateColumn } from "typeorm";

/**
 * NotificationPreference Entity — table `notification_preferences` PARTAGÉE
 * avec matchsheet. Une ligne par utilisateur (créée à la demande, au premier
 * changement de préférence — sinon `emailEnabled` par défaut vaut `true`,
 * voir PlatformNotificationService.getPreference).
 */
@Entity("notification_preferences")
export class NotificationPreference {
  @PrimaryColumn({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "tinyint", default: 1, name: "email_enabled" })
  emailEnabled!: boolean;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
