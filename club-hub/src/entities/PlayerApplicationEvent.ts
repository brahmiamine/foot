import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { PlayerApplication, type ApplicationStatus } from "./PlayerApplication";
import { Team } from "./Team";

export type PlayerApplicationEventType =
  | "PRE_SCREENED"
  | "TRIAL_SCHEDULED"
  | "TECHNICAL_APPROVED"
  | "ADMIN_APPROVED"
  | "REJECTED"
  | "PLAYER_CREATED";

/** Ledger append-only des transitions de candidature académie, scopé par club. */
@Entity("cms_player_application_events")
export class PlayerApplicationEvent {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "bigint", name: "application_id" })
  applicationId!: number;

  @ManyToOne(() => PlayerApplication, { onDelete: "CASCADE" })
  @JoinColumn({ name: "application_id" })
  application!: PlayerApplication;

  @Column({ type: "varchar", length: 191, name: "actor_id" })
  actorId!: string;

  @Column({ type: "varchar", length: 40, name: "event_type" })
  eventType!: PlayerApplicationEventType;

  @Column({ type: "varchar", length: 40, name: "from_status" })
  fromStatus!: ApplicationStatus;

  @Column({ type: "varchar", length: 40, name: "to_status" })
  toStatus!: ApplicationStatus;

  @Column({ type: "longtext", nullable: true, name: "details_json" })
  detailsJson?: string | null;

  @CreateDateColumn({ type: "datetime", precision: 3, name: "created_at" })
  createdAt!: Date;
}
