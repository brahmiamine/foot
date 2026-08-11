import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("ob_notification_cursor")
export class ObNotificationCursor {
  @PrimaryColumn({ type: "varchar", length: 32 })
  id!: string;

  @Column({ type: "datetime", name: "last_checked_at" })
  lastCheckedAt!: Date;
}
