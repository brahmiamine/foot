import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

/** Mappée sur `cms_ticket_order_items`. Écrite par `ob` (l'achat a lieu ici) ; lue aussi par teamManager. */
@Entity("cms_ticket_order_items")
export class TicketOrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", name: "order_id" })
  orderId!: number;

  @Column({ type: "int", name: "ticket_category_id" })
  ticketCategoryId!: number;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "unit_price" })
  unitPrice!: string;
}
