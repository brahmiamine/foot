import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export type TicketingMatchType = "OFFICIAL" | "FRIENDLY";
export type TicketingEventStatus = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED" | "CANCELLED";

/** Mappée sur `cms_ticketing_events` (config gérée par teamManager). Lecture seule ici. */
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

  @Column({ type: "bigint", nullable: true, name: "friendly_match_id" })
  friendlyMatchId?: number | null;

  @Column({ type: "enum", enum: ["DRAFT", "SCHEDULED", "OPEN", "CLOSED", "CANCELLED"], default: "DRAFT" })
  status!: TicketingEventStatus;

  @Column({ type: "datetime", nullable: true, name: "sales_start_at" })
  salesStartAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "sales_end_at" })
  salesEndAt?: Date | null;

  @Column({ type: "int", default: 5, name: "max_tickets_per_order" })
  maxTicketsPerOrder!: number;
}
