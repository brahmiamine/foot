import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type TicketStatus = "HELD" | "ISSUED" | "USED" | "CANCELLED" | "EXPIRED";

/**
 * Mappée sur `cms_tickets`. Écrite par `ob` (émission) ; lue/mise à jour
 * aussi par teamManager (scan/annulation). `tokenEncrypted` (chiffré,
 * AES-256-GCM) permet à `ob` de ré-afficher le QR/PDF d'un billet déjà émis
 * sans le régénérer (voir src/lib/ticketToken.ts) — jamais stocké en clair.
 */
@Entity("cms_tickets")
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "int", name: "ticketing_event_id" })
  ticketingEventId!: number;

  @Column({ type: "int", name: "order_id" })
  orderId!: number;

  @Column({ type: "int", name: "order_item_id" })
  orderItemId!: number;

  @Column({ type: "int", name: "ticket_category_id" })
  ticketCategoryId!: number;

  @Column({ type: "varchar", length: 32, name: "ticket_number" })
  ticketNumber!: string;

  @Column({ type: "char", length: 64, name: "token_hash" })
  tokenHash!: string;

  @Column({ type: "varchar", length: 255, name: "token_encrypted" })
  tokenEncrypted!: string;

  @Column({ type: "varchar", length: 100, nullable: true, name: "holder_first_name" })
  holderFirstName?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, name: "holder_last_name" })
  holderLastName?: string | null;

  @Column({ type: "enum", enum: ["HELD", "ISSUED", "USED", "CANCELLED", "EXPIRED"], default: "HELD" })
  status!: TicketStatus;

  @Column({ type: "datetime", nullable: true, name: "issued_at" })
  issuedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "used_at" })
  usedAt?: Date | null;

  @Column({ type: "datetime", nullable: true, name: "cancelled_at" })
  cancelledAt?: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", nullable: true, name: "updated_at" })
  updatedAt?: Date | null;
}
