import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type TicketOrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

/** Mappée sur `cms_ticket_orders`. Écrite par `ob` (l'achat a lieu ici) ; lue/gérée aussi par teamManager. */
@Entity("cms_ticket_orders")
export class TicketOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "int", name: "ticketing_event_id" })
  ticketingEventId!: number;

  @Column({ type: "varchar", length: 32, name: "order_number" })
  orderNumber!: string;

  @Column({ type: "varchar", length: 191, nullable: true, name: "user_id" })
  userId?: string | null;

  @Column({ type: "varchar", length: 100, name: "customer_first_name" })
  customerFirstName!: string;

  @Column({ type: "varchar", length: 100, name: "customer_last_name" })
  customerLastName!: string;

  @Column({ type: "varchar", length: 255, name: "customer_email" })
  customerEmail!: string;

  @Column({ type: "varchar", length: 30, nullable: true, name: "customer_phone" })
  customerPhone?: string | null;

  @Column({ type: "enum", enum: ["PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"], default: "PENDING" })
  status!: TicketOrderStatus;

  @Column({ type: "datetime", nullable: true, name: "expires_at" })
  expiresAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
