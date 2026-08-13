import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { ReservationStatus } from '../enums/reservation-status.enum';

/**
 * TASK-P0-005 (todo.md) : une réclamation de quantité sur un InventoryItem,
 * ouverte par InventoryService.reserveStock et fermée par exactement une
 * de confirmReservation (paiement confirmé) / releaseReservation (annulé)
 * / l'expiration automatique (TTL, voir expireStaleReservations).
 *
 * `referenceId` est fourni par l'appelant (ex. un SellerOrderItem.id une
 * fois le tunnel de commande — TASK-P0-004 — construit ; un identifiant de
 * panier avant ça) : opaque pour InventoryService, jamais interprété, sert
 * uniquement de clé d'idempotence par (inventoryItemId, referenceId) —
 * rejouer une réservation pour la même référence ne réserve jamais deux
 * fois la même quantité.
 */
@Entity('sp_stock_reservations')
@Unique(['inventoryItemId', 'referenceId'])
export class StockReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 191 })
  inventoryItemId: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @Column({ type: 'varchar', length: 191 })
  referenceId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Index()
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.RESERVED,
  })
  status: ReservationStatus;

  // NULL une fois la réservation résolue (CONFIRMED/RELEASED/EXPIRED) —
  // n'a plus de sens de l'expirer après coup. Tant que RESERVED, une
  // réservation dont expiresAt est dépassé est candidate à
  // expireStaleReservations().
  @Index()
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
