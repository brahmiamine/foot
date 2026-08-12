import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductStatus } from '../enums/product-status.enum';
import { Seller } from '../../sellers/entities/seller.entity';
import type { ProductImage } from './product-image.entity';

@Entity('products')
@Index(['sellerId', 'status'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 191 })
  sellerId: string;

  @ManyToOne(() => Seller, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller: Seller;

  @Column({ type: 'varchar', length: 191 })
  name: string;

  @Column({ type: 'varchar', length: 220 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  shortDescription: string | null;

  @Column({ type: 'varchar', length: 191, nullable: true })
  categoryId: string | null;

  @Column({ type: 'varchar', length: 191, nullable: true })
  brand: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  sku: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  price: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  compareAtPrice: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: string;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'varchar', length: 191, nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('ProductImage', (i: ProductImage) => i.product)
  images: ProductImage[];
}
