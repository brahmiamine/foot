import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Match } from "./Match";
import { FriendlyMatch } from "./FriendlyMatch";

export type TicketingMatchType = "OFFICIAL" | "FRIENDLY";
export type TicketingEventStatus = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED" | "CANCELLED";

/**
 * TicketingEvent Entity — la billetterie d'un match. Référence soit un
 * match officiel (`matches`), soit un match amical (`cms_friendly_matches`),
 * jamais les deux (même convention que Trip). Ne duplique aucune info du
 * match : toujours re-résoudre via la relation.
 */
@Entity("cms_ticketing_events")
export class TicketingEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "enum", enum: ["OFFICIAL", "FRIENDLY"], name: "match_type" })
  matchType!: TicketingMatchType;

  @Column({ type: "char", length: 36, nullable: true, name: "match_id" })
  matchId?: string | null;

  @ManyToOne(() => Match, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "match_id" })
  match?: Match | null;

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

  @ManyToOne(() => FriendlyMatch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "friendly_match_id" })
  friendlyMatch?: FriendlyMatch | null;

  @Column({ type: "enum", enum: ["DRAFT", "SCHEDULED", "OPEN", "CLOSED", "CANCELLED"], default: "DRAFT" })
  status!: TicketingEventStatus;

  @Column({ type: "datetime", nullable: true, name: "sales_start_at" })
  salesStartAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "sales_end_at" })
  salesEndAt?: Date | null;

  @Column({ type: "int", default: 5, name: "max_tickets_per_order" })
  maxTicketsPerOrder!: number;

  @Column({ type: "varchar", length: 191, nullable: true, name: "created_by" })
  createdBy?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
