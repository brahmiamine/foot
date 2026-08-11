import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_ticketing_event_categories`. Lecture seule ici (quotas gérés par teamManager, sold_count mis à jour par `ob` lors d'un achat — voir TicketOrderService). */
@Entity("cms_ticketing_event_categories")
export class TicketingEventCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", name: "ticketing_event_id" })
  ticketingEventId!: number;

  @Column({ type: "int", name: "ticket_category_id" })
  ticketCategoryId!: number;

  @Column({ type: "int" })
  quota!: number;

  @Column({ type: "int", default: 0, name: "sold_count" })
  soldCount!: number;

  @Column({ type: "tinyint", default: 1, name: "is_available" })
  isAvailable!: boolean;
}
