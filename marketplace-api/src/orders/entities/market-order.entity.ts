import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MarketOrderStatus } from '../enums/market-order-status.enum';

/**
 * Commande globale passée par un supporter — peut contenir les produits de
 * plusieurs vendeurs, chacun voyant sa part via SellerOrder (seller-orders
 * module). TASK-P0-004 (todo.md) : créée par CheckoutService, jamais
 * directement.
 */
@Entity('sp_market_orders')
@Index(['memberId', 'idempotencyKey'], { unique: true })
export class MarketOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  orderNumber: string;

  // User.id (sso, rôle MEMBER) de l'acheteur — le panier et la commande
  // sont scopés par ce champ. Nullable pour compatibilité avec toute ligne
  // scaffolding antérieure à TASK-P0-004 (aucune en pratique, la table
  // était vide, mais la colonne reste nullable par prudence plutôt que
  // NOT NULL sans valeur par défaut sûre).
  @Index()
  @Column({ type: 'varchar', length: 191, nullable: true })
  memberId: string | null;

  // Clé d'idempotence fournie par l'appelant (ob) — un double clic/retry
  // réseau sur le checkout renvoie la commande déjà créée plutôt que d'en
  // créer une seconde. Scopée par membre (comme Payment.idempotencyKey
  // dans payment-api, scopé par callerApplication).
  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'varchar', length: 191 })
  customerName: string;

  @Column({ type: 'varchar', length: 191 })
  customerEmail: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  customerPhone: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  shippingAddress: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  totalAmount: string;

  @Column({
    type: 'enum',
    enum: MarketOrderStatus,
    default: MarketOrderStatus.PENDING,
  })
  status: MarketOrderStatus;

  // Payment.id de payment-api couvrant toute la commande (un seul paiement
  // pour tous les vendeurs impliqués, voir CheckoutService.checkout) — même
  // convention que billetterie/teamManager. Null tant que l'initiation du
  // paiement n'a pas réussi.
  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  paymentId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
