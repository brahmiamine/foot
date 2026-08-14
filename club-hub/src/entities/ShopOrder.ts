import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type ShopOrderStatus = "PENDING" | "PAID" | "CANCELLED";

/**
 * ShopOrder Entity — commande client sur la boutique (voir
 * src/services/ShopOrderService.ts). Un panier ne mélange jamais deux
 * clubs (voir /boutique/[teamId]) : `teamId` identifie sans ambiguïté le
 * club vendeur de toute la commande, comme `organizerTeamId` sur
 * ticketing/src/entities/Ticket.ts.
 */
@Entity({ name: "shop_orders" })
export class ShopOrder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  // User.id (sso, rôle MEMBER).
  @Column({ type: "varchar", length: 191, name: "purchaser_id" })
  purchaserId!: string;

  @Column({
    type: "enum",
    enum: ["PENDING", "PAID", "CANCELLED"],
    default: "PENDING",
  })
  status!: ShopOrderStatus;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "total_price" })
  totalPrice!: string;

  @Column({ type: "varchar", length: 36, name: "payment_id", nullable: true })
  paymentId!: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "datetime", name: "paid_at", nullable: true })
  paidAt!: Date | null;
}
