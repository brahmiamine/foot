import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Team } from "./Team";
import { User } from "./User";

export type OrderStatus = "PENDING" | "CONFIRMED" | "READY" | "DELIVERED" | "CANCELLED";

/**
 * Order Entity — commande passée sur la boutique du club (`cms_products`,
 * jusqu'ici catalogue seul). L'acheteur est soit un compte du club
 * (`userId`), soit un client non-membre identifié par nom/téléphone. Les
 * lignes de commande (`cms_order_items`) sont chargées séparément par
 * `ShopOrderService` (pas de relation OneToMany ici, pour éviter tout
 * import circulaire avec `OrderItem`). Table propre à cette app, scopée
 * par team_id.
 */
@Entity("cms_orders")
export class Order {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: Team;

  @Column({ type: "varchar", length: 191, nullable: true, name: "user_id" })
  userId?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  @Column({ type: "varchar", length: 150, nullable: true, name: "customer_name" })
  customerName?: string | null;

  @Column({ type: "varchar", length: 30, nullable: true, name: "customer_phone" })
  customerPhone?: string | null;

  @Column({ type: "enum", enum: ["PENDING", "CONFIRMED", "READY", "DELIVERED", "CANCELLED"], default: "PENDING" })
  status!: OrderStatus;

  @Column({ type: "decimal", precision: 10, scale: 3, default: 0, name: "total_amount" })
  totalAmount!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  notes?: string | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
