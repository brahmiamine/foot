import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Quota d'une catégorie pour une billetterie précise (même catégorie, quota différent d'un match à l'autre). */
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
