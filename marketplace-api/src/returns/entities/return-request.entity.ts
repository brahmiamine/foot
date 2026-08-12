import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReturnStatus } from '../enums/return-status.enum';
import { SellerOrder } from '../../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../../seller-orders/entities/seller-order-item.entity';

/**
 * Demande de retour initiée par le client. Scaffolding (TS-03) : entité
 * prête, workflow REQUESTED -> APPROVED/REJECTED -> COMPLETED (US-50 à
 * US-52, Epic E16) à implémenter.
 */
@Entity('sp_return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 191 })
  sellerId: string;

  @Column({ type: 'varchar', length: 191 })
  sellerOrderId: string;

  @ManyToOne(() => SellerOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerOrderId' })
  sellerOrder: SellerOrder;

  @Column({ type: 'varchar', length: 191 })
  sellerOrderItemId: string;

  @ManyToOne(() => SellerOrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerOrderItemId' })
  sellerOrderItem: SellerOrderItem;

  @Column({ type: 'varchar', length: 191 })
  customerName: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: ReturnStatus, default: ReturnStatus.REQUESTED })
  status: ReturnStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
