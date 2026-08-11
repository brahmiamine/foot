import { Entity, PrimaryColumn, Column, UpdateDateColumn } from "typeorm";

@Entity("ob_notification_prefs")
export class ObNotificationPrefs {
  @PrimaryColumn({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "tinyint", default: 1 })
  matches!: boolean;

  @Column({ type: "tinyint", default: 1 })
  results!: boolean;

  @Column({ type: "tinyint", default: 1 })
  news!: boolean;

  @Column({ type: "tinyint", default: 0, name: "women_team" })
  womenTeam!: boolean;

  @Column({ type: "tinyint", default: 0 })
  youth!: boolean;

  @Column({ type: "tinyint", default: 1, name: "favorite_players" })
  favoritePlayers!: boolean;

  @Column({ type: "tinyint", default: 0 })
  shop!: boolean;

  @Column({ type: "tinyint", default: 0 })
  ticketing!: boolean;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
