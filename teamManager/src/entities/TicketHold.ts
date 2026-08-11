import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("cms_ticket_holds")
export class TicketHold {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "int", name: "ticketing_event_id" })
  ticketingEventId!: number;

  @Column({ type: "int", name: "order_id" })
  orderId!: number;

  @Column({ type: "int", name: "ticket_category_id" })
  ticketCategoryId!: number;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "datetime", name: "expires_at" })
  expiresAt!: Date;

  @Column({ type: "datetime", nullable: true, name: "released_at" })
  releasedAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
