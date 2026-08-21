import "reflect-metadata";
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

/**
 * TICK-007 (P2) — une ligne par match déjà couvert par un abonnement
 * saison ; l'index unique (season_pass_id, match_ticket_category_id)
 * empêche tout double retrait sur le même match, y compris en cas de course
 * (contrainte DB, pas seulement applicative — voir SeasonPassService.redeem).
 */
@Entity({ name: "tk_season_pass_redemptions" })
@Index(["seasonPassId", "matchTicketCategoryId"], { unique: true })
export class SeasonPassRedemption {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "season_pass_id" })
  seasonPassId!: string;

  @Column({ type: "char", length: 36, name: "match_ticket_category_id" })
  matchTicketCategoryId!: string;

  @Column({ type: "char", length: 36, name: "ticket_id" })
  ticketId!: string;

  @CreateDateColumn({ type: "datetime", name: "redeemed_at" })
  redeemedAt!: Date;
}
