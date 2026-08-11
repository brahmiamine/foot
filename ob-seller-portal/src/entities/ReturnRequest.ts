import "reflect-metadata";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ReturnStatus } from "./enums";
import { SellerOrder } from "./SellerOrder";
import { SellerOrderItem } from "./SellerOrderItem";

/**
 * Demande de retour initiée par le client. Le vendeur consulte et exécute,
 * mais les règles d'acceptation/remboursement restent définies par l'OB
 * (statut piloté par la Marketplace API, jamais par une règle inventée ici).
 */
@Entity({ name: "sp_return_requests" })
export class ReturnRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  sellerId!: string;

  @Column({ type: "varchar", length: 191 })
  sellerOrderId!: string;

  @ManyToOne("SellerOrder", { onDelete: "CASCADE" })
  @JoinColumn({ name: "sellerOrderId" })
  sellerOrder!: SellerOrder;

  @Column({ type: "varchar", length: 191 })
  sellerOrderItemId!: string;

  @ManyToOne("SellerOrderItem", { onDelete: "CASCADE" })
  @JoinColumn({ name: "sellerOrderItemId" })
  sellerOrderItem!: SellerOrderItem;

  @Column({ type: "varchar", length: 191 })
  customerName!: string;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "enum", enum: ReturnStatus, default: ReturnStatus.REQUESTED })
  status!: ReturnStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
