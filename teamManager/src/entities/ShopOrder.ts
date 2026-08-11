import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

/**
 * Commande d'un supporter sur la boutique d'un club (`cms_products`) —
 * checkout/paiement réel via `payment-api`, sur le même modèle que
 * `billetterie/src/entities/Ticket.ts` (voir `src/services/OrderService.ts`
 * pour la réservation + le paiement + la réconciliation).
 *
 * Contrairement à `Ticket` (une ligne par billet, pour une référence de
 * contrôle individuelle à l'entrée), une commande boutique est UNE ligne =
 * UN produit + une quantité : rien ici ne nécessite d'identifier chaque
 * article séparément après achat, donc pas de sur-découpage inutile.
 *
 * `teamId` est le club vendeur (`Product.teamId` au moment de l'achat),
 * jamais le club du supporter acheteur (`buyerId`, un `User.id` sso de rôle
 * `MEMBER` — pas de contrainte FK réelle, base partagée mais cross-app).
 * Table `shop_orders` (pas `cms_*`, voir `db/OWNERSHIP.md` § « Boutique »
 * qui anticipait déjà un préfixe `shop_` dédié aux commandes).
 */
@Entity({ name: "shop_orders" })
export class ShopOrder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "char", length: 36, name: "team_id" })
  teamId!: string;

  @Column({ type: "bigint", name: "product_id" })
  productId!: number;

  // User.id (sso, rôle MEMBER) — varchar(191) pour matcher sso/src/entities/User.ts.
  @Index()
  @Column({ type: "varchar", length: 191, name: "buyer_id" })
  buyerId!: string;

  @Column({ type: "int" })
  quantity!: number;

  // Prix unitaire au moment de l'achat (snapshot) : un changement de prix du
  // produit après coup ne doit jamais modifier une commande déjà passée.
  @Column({ type: "decimal", precision: 10, scale: 3, name: "unit_price" })
  unitPrice!: string;

  @Column({ type: "decimal", precision: 10, scale: 3, name: "total_amount" })
  totalAmount!: string;

  @Column({
    type: "enum",
    enum: ["PENDING", "PAID", "CANCELLED"],
    default: "PENDING",
  })
  status!: "PENDING" | "PAID" | "CANCELLED";

  @Index({ unique: true })
  @Column({ type: "varchar", length: 32 })
  reference!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "datetime", name: "paid_at", nullable: true })
  paidAt!: Date | null;

  /**
   * Payment.id de payment-api pour le paiement couvrant cette commande.
   * NULL tant que l'appel POST /payments/konnect/init n'a pas réussi (voir
   * OrderService.purchaseProduct) — une commande sans payment_id qui reste
   * PENDING plus de quelques minutes signale un échec d'initiation, pas un
   * paiement en cours.
   */
  @Column({ type: "varchar", length: 36, name: "payment_id", nullable: true })
  paymentId!: string | null;
}
